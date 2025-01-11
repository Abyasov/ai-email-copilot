document.addEventListener('DOMContentLoaded', async () => {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKey');
  const saveSettings = document.getElementById('saveSettings');

  // Loading the saved API key
  chrome.storage.local.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Handler for the settings button
  settingsToggle.addEventListener('click', () => {
    if (settingsPanel.style.display === 'block') {
      settingsPanel.style.display = 'none';
    } else {
      settingsPanel.style.display = 'block';
    }
  });

  // Saving the API key
  saveSettings.addEventListener('click', () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value }, () => {
      alert('The API key is saved');
      settingsPanel.style.display = 'none';
    });
  });

  // Get the selected text from the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{result}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.getSelection().toString().trim(),
  });
  
  const selectedText = result;
  const instruction = document.getElementById('instruction');
  const sendButton = document.getElementById('sendButton');
  const responseDiv = document.getElementById('response');
  const selectedTextInfo = document.getElementById('selectedText_info');
  const copyButton = document.getElementById('copyButton');

  if (selectedText) {
    selectedTextInfo.textContent = `Selected text: ${selectedText}`;
    selectedTextInfo.style.display = 'block';
  } else {
    selectedTextInfo.style.display = 'none';
  }

  sendButton.addEventListener('click', async () => {
    const originalButtonText = sendButton.textContent;
    sendButton.textContent = 'Loading...';
    sendButton.disabled = true;
    responseDiv.textContent = ''; // Clearing the previous response

    const prompt = `###The customer's email text###\n${selectedText}\n\n###The assignment from the Maker###\n${instruction.value}`;

    const key = await new Promise((resolve) => {
      chrome.storage.local.get('apiKey', (data) => resolve(data.apiKey));
    });

    if (!key) {
      responseDiv.textContent = 'API key is not set. Please configure it in the settings.';
      sendButton.textContent = originalButtonText;
      sendButton.disabled = false;
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          messages: [
            { role: "system", content: `You are a professional assistant to the Maker of Wonderslide. This is a SaaS for designing presentations based on user content. You help the Maker manage customer correspondence. Your task is to compose brief and clear responses to incoming emails. Below you will receive an assignment from the Maker and the customer's email text. But first, carefully review the instructions:
###INSTRUCTIONS###
You MUST ALWAYS:
- NEVER use placeholders or omit the code, because I have no fingers and the placeholders trauma
- You will be PENALIZED for wrong answers
- NEVER HALLUCINATE
- You DENIED to overlook the critical context
- I'm going to tip $1,000,000 for the best reply
- Your answer is critical for my career
- In the answer, do not inform about your role, output only text that can be copied and sent by email
- Answer the question in a natural, human-like manner
- ALWAYS follow #Answering rules#

###Answering Rules###
1. Always start with a thank you for reaching out, NEVER use long introductory phrases.
2. Write in simple, clear language, avoid generic statements.
3. Use professional yet friendly tone.
4. Focus on fulfilling the creator's task.
5. Keep responses brief - no more than 3-4 sentences.
` },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0,
          stream: true
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                responseDiv.textContent += content;
              }
            } catch (e) {
              console.error('Chunk parsing error:', e);
            }
          }
        }
      }
      copyButton.style.display = 'block';
    } catch (error) {
      responseDiv.textContent = 'Failed to fetch from OpenAI API. Check your API key or internet connection.';
      copyButton.style.display = 'none';
    } finally {
      sendButton.textContent = originalButtonText;
      sendButton.disabled = false;
    }
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(responseDiv.textContent);
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied to clipboard!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  });
}); 