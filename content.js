if (typeof window.SYSTEM_PROMPT === 'undefined') {
  window.SYSTEM_PROMPT = `\
You are a professional assistant to the Maker of Wonderslide. \
This is a SaaS for designing presentations based on user content. \
You help the Maker manage customer correspondence. \
Your task is to compose brief and clear responses to incoming emails. \
Below you will receive an assignment from the Maker and the customer's email text. \
But first, carefully review the instructions:
###INSTRUCTIONS###
You MUST ALWAYS:
- NEVER use placeholders or omit the code, because I have no fingers and \
the placeholders trauma
- You will be PENALIZED for wrong answers
- NEVER HALLUCINATE
- You DENIED to overlook the critical context
- I'm going to tip $1,000,000 for the best reply
- Your answer is critical for my career
- In the answer, do not inform about your role, output only text that can be copied \
and sent by email
- Answer the question in a natural, human-like manner
- If it posible ALWAYS use information from #FAQ#, 
- When you use information from #FAQ#, NEVER reduce the answer! 
- ALWAYS follow #Answering rules#


###FAQ###
# How to Cancel Your Subscription
We're sorry to see you go and would greatly appreciate any feedback about \
what led to your decision.
To cancel your subscription, please follow these steps:
1. Log in to the account associated with your paid plan \
(the email address where you receive our communications)
2. Navigate to Account → Payments
3. In the window that appears, you'll see your current plan and its expiration date
4. For subscription plans, the renewal will happen automatically on the last day \
of the indicated date
5. To cancel automatic renewal, click the "Cancel subscription" button and confirm your decision

Note: If you don't see the cancellation button, this means your plan or payment method \
doesn't include automatic renewal, and no additional actions are needed to cancel your plan.


###Answering Rules###
1. Always start with a thank you for reaching out, NEVER use long introductory phrases.
2. Write in simple, clear language, avoid generic statements.
3. Use professional yet friendly tone.
4. Focus on fulfilling the creator's task.
5. Try to keep responses brief.`;
}

(async function initDialog() {
  try {
    console.log('Initializing dialog...');
    await showDialog();
  } catch (error) {
    console.error('Failed to initialize extention dialog:', error);
  }
})();

async function showDialog() {
  // Check if dialog is already open
  if (document.getElementById('email-copilot-block')) {
    console.log('Dialog already exists');
    return;
  }

  try {
    const templateUrl = chrome.runtime.getURL('dialog.html');
    const response = await fetch(templateUrl);
    const html = await response.text();
    
    // Create a temporary container
    const template = document.createElement('div');
    template.innerHTML = html;
    
    // Extract styles from template and add them to head
    const styles = template.querySelector('style');
    if (styles) {
      document.head.appendChild(styles);
    }
    
    // Extract the dialog itself
    const dialog = template.querySelector('#email-copilot-block');
    if (!dialog) {
      throw new Error('Dialog element not found in template');
    }

    // Add the dialog to the page
    document.body.appendChild(dialog);
    
    // Setup functionality
    setupDragging(dialog);
    setupDialogFunctionality(dialog);
  } catch (error) {
    console.error('Error in showDialog:', error);
    throw error;
  }
}


function processEmailText(text) {
  return text
    // Remove double spaces recursively
    .replace(/ {2,}/g, ' ')
    // Collapse lines containing only spaces, dots, or commas
    .replace(/(\n)\s*[.,\s]+\n/g, '\n')
    // Remove double line breaks recursively
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function getEmailContent() {
  // Setup order to check: Gmail, Outlook, Zoho
  const services = [
      {
          name: 'Gmail',
          titleSelector: '.hP',
          textSelector: '.ii.gt'
      },
      {
          name: 'Outlook',
          titleSelector: 'div[role="main"] div[role="heading"]',
          textSelector: 'div[role="main"] div[role="document"]'
      },
      {
          name: 'Zoho',
          titleSelector: '.zmPVHeading.jsConvSB',
          textSelector: '.zmMailContent'
      }
  ];

  for (const service of services) {
    const titleElement = document.querySelector(service.titleSelector);
    const textElement = document.querySelector(service.textSelector);

    if (titleElement && textElement) {
      const emailTitle = titleElement.innerText;
      const emailText = textElement.innerText;
      return { title: emailTitle, text: emailText };
    };
  };
}

function getContext() {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    return selection;
  }
  
  const emailContent = getEmailContent();
  if (!emailContent) {
    return '';
  }
  const { title, text } = emailContent;
  if (title && text) {
    return `Subj: ${title}\nEmail text:${text}`;
  } else if (title) {
    return `Subj: ${title}`;
  } else if (text) {
    return `Email text:${text}`;
  }
  
  return '';
}




function setupDragging(dialog) {
  const header = dialog.querySelector('.header-aec');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - dialog.offsetLeft;
    initialY = e.clientY - dialog.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      dialog.style.left = `${currentX}px`;
      dialog.style.top = `${currentY}px`;
      dialog.style.right = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}



function setupDialogFunctionality(dialog) {
  const closeButton = dialog.querySelector('.close-button');
  
  const input = dialog.querySelector('#instruction-input');
  const contextBlock = dialog.querySelector('#context-block');
  const sendButton = dialog.querySelector('#send-button');
  
  const output = dialog.querySelector('#response-output');
  const copyButton = dialog.querySelector('#copy-button');
  
  const settingsToggle = dialog.querySelector('#settings-toggle');
  const settingsPanel = dialog.querySelector('#settings-panel');
  const apiKeyInput = dialog.querySelector('#apikey-input');
  const saveSettings = dialog.querySelector('#save-settings');
  
  const backButton = dialog.querySelector('#back-button');
  const inputScreen = dialog.querySelector('#input-screen');
  const outputScreen = dialog.querySelector('#output-screen');

  // Show selected or email text
  const context = getContext();
  if (context) {
    contextBlock.textContent = `${context}`;
    contextBlock.style.display = 'block';
  } else {
    contextBlock.style.display = 'none';
  }

  // Load saved API key
  chrome.storage.local.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Close dialog
  closeButton.addEventListener('click', () => {
    dialog.remove();
  });

  // Close dialog by Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.contains(dialog)) {
      dialog.remove();
    }
  });

  // Settings
  settingsToggle?.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  // Save API key
  saveSettings?.addEventListener('click', () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value }, () => {
      alert('API key saved');
      settingsPanel.style.display = 'none';
    });
  });

  // Function to switch screens
  function showInputScreen() {
    inputScreen.style.display = 'flex';
    outputScreen.style.display = 'none';
    backButton.style.display = 'none';
    input.focus();
  }

  function showOutputScreen() {
    inputScreen.style.display = 'none';
    outputScreen.style.display = 'flex';
    backButton.style.display = 'block';
  }

  // Back button handler
  backButton.addEventListener('click', showInputScreen);

  // Send request
  sendButton.addEventListener('click', async () => {
    const originalButtonText = sendButton.textContent;
    sendButton.textContent = 'Loading...';
    sendButton.disabled = true;
    output.textContent = '';

    const prompt = `###Сlient wrote:###\n${context}\n\n###Task:###\n${input.value}`;

    const key = await new Promise((resolve) => {
      chrome.storage.local.get('apiKey', (data) => resolve(data.apiKey));
    });

    if (!key) {
      output.textContent = 'API key is not set. Please configure it in the settings.';
      sendButton.textContent = originalButtonText;
      sendButton.disabled = false;
      return;
    }

    try {
      showOutputScreen();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0,
          stream: true
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (copyButton) {
            copyButton.style.display = 'block';
          }
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                output.textContent += content;
              }
            } catch (e) {
              console.error('Chunk parsing error:', e);
            }
          }
        }
      }
    } catch (error) {
      showInputScreen();
      output.textContent = 'Failed to fetch from OpenAI API. Check your API key or internet connection.';
      if (copyButton) {
        copyButton.style.display = 'none';
      }
    } finally {
      sendButton.textContent = originalButtonText;
      sendButton.disabled = false;
    }
  });

  // Copy answer
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(output.textContent);
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Copy error:', err);
      }
    });
  }

  input.focus();
}