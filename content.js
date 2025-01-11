// Сразу вызываем функцию при загрузке скрипта
(async function initDialog() {
  try {
    console.log('Initializing dialog...');
    await showDialog();
  } catch (error) {
    console.error('Failed to initialize dialog:', error);
  }
})();

async function showDialog() {
  // Проверяем, не открыт ли уже диалог
  if (document.getElementById('email-copilot-block')) {
    console.log('Dialog already exists');
    return;
  }

  try {
    const templateUrl = chrome.runtime.getURL('dialog.html');
    const response = await fetch(templateUrl);
    const html = await response.text();
    
    // Создаем временный контейнер
    const template = document.createElement('div');
    template.innerHTML = html;
    
    // Извлекаем стили из template и добавляем их в head
    const styles = template.querySelector('style');
    if (styles) {
      document.head.appendChild(styles);
    }
    
    // Извлекаем сам диалог
    const dialog = template.querySelector('#email-copilot-block');
    if (!dialog) {
      throw new Error('Dialog element not found in template');
    }

    // Добавляем диалог на страницу
    document.body.appendChild(dialog);
    
    // Настраиваем функциональность
    setupDragging(dialog);
    setupDialogFunctionality(dialog);
  } catch (error) {
    console.error('Error in showDialog:', error);
    throw error;
  }
}

function setupDragging(dialog) {
  const header = dialog.querySelector('.header');
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

function getSelectedText() {
  return window.getSelection().toString().trim();
}

function setupDialogFunctionality(dialog) {
  const closeButton = dialog.querySelector('.close-button');
  
  const input = dialog.querySelector('#instruction-input');
  const selectedTextInfo = dialog.querySelector('#selected-text-info');
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

  // Показываем выделенный текст
  const selectedText = getSelectedText();
  if (selectedText) {
    selectedTextInfo.textContent = `Selected text: ${selectedText}`;
    selectedTextInfo.style.display = 'block';
  } else {
    selectedTextInfo.style.display = 'none';
  }

  // Загружаем сохраненный API ключ
  chrome.storage.local.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Закрытие диалога
  closeButton.addEventListener('click', () => {
    dialog.remove();
  });

  // Закрытие диалога по Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.contains(dialog)) {
      dialog.remove();
    }
  });

  // Настройки
  settingsToggle?.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  // Сохранение API ключа
  saveSettings?.addEventListener('click', () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value }, () => {
      alert('API key saved');
      settingsPanel.style.display = 'none';
    });
  });

  // Функция переключения экранов
  function showInputScreen() {
    inputScreen.style.display = 'flex';
    outputScreen.style.display = 'none';
    backButton.style.display = 'none';
  }

  function showOutputScreen() {
    inputScreen.style.display = 'none';
    outputScreen.style.display = 'flex';
    backButton.style.display = 'block';
  }

  // Обработчик кнопки "назад"
  backButton.addEventListener('click', showInputScreen);

  // Отправка запроса
  sendButton.addEventListener('click', async () => {
    const originalButtonText = sendButton.textContent;
    sendButton.textContent = 'Loading...';
    sendButton.disabled = true;
    output.textContent = '';

    const prompt = `###The customer's email text###\n${selectedText}\n\n###The assignment from the Maker###\n${input.value}`;

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
      // Показываем экран с ответом
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
            { 
              role: "system", 
              content: `You are a professional assistant to the Maker of Wonderslide. This is a SaaS for designing presentations based on user content. You help the Maker manage customer correspondence. Your task is to compose brief and clear responses to incoming emails. Below you will receive an assignment from the Maker and the customer's email text. But first, carefully review the instructions:
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
5. Keep responses brief - no more than 3-4 sentences.`
            },
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
      showInputScreen(); // В случае ошибки возвращаемся к экрану ввода
      output.textContent = 'Failed to fetch from OpenAI API. Check your API key or internet connection.';
      if (copyButton) {
        copyButton.style.display = 'none';
      }
    } finally {
      sendButton.textContent = originalButtonText;
      sendButton.disabled = false;
    }
  });

  // Копирование ответа
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
}