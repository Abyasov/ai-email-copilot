(function() {
    // Check if the block has already been added
    if (document.getElementById('email-copilot-block')) {
      return;
    }
  
    // Create the main container
    const container = document.createElement('div');
    container.id = 'email-copilot-block';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.width = '300px';
    container.style.height = '400px';
    container.style.backgroundColor = '#ffffff';
    container.style.border = '1px solid #ccc';
    container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    container.style.zIndex = '10000';
    container.style.borderRadius = '8px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.resize = 'both';
    container.style.overflow = 'hidden';
  
    // Create the draggable header
    const header = document.createElement('div');
    header.style.cursor = 'move';
    header.style.backgroundColor = '#f1f1f1';
    header.style.padding = '10px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
  
    // Text title
    const title = document.createElement('span');
    title.textContent = 'Email Copilot';
    title.style.flex = '1';
  
    // Close button
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '10px';
    closeButton.style.fontSize = '20px';
    closeButton.style.fontWeight = 'bold';
  
    // Add the title and close button to the header
    header.appendChild(title);
    header.appendChild(closeButton);
    container.appendChild(header);
  
    // Create the input area for instructions
    const inputArea = document.createElement('textarea');
    inputArea.id = 'instruction-input';
    inputArea.placeholder = 'Enter your instructions...';
    inputArea.style.flex = '1';
    inputArea.style.margin = '10px';
    inputArea.style.padding = '10px';
    inputArea.style.border = '1px solid #ccc';
    inputArea.style.borderRadius = '4px';
    inputArea.style.resize = 'none';
  
    // Create the send button
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.margin = '10px';
    sendButton.style.padding = '10px';
    sendButton.style.backgroundColor = '#4CAF50';
    sendButton.style.color = '#fff';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
  
    // Create the output area for the response
    const outputArea = document.createElement('div');
    outputArea.id = 'response-output';
    outputArea.style.flex = '1';
    outputArea.style.margin = '10px';
    outputArea.style.padding = '10px';
    outputArea.style.border = '1px solid #ccc';
    outputArea.style.borderRadius = '4px';
    outputArea.style.overflowY = 'auto';
    outputArea.style.backgroundColor = '#f9f9f9';
  
    // Add the elements to the container
    container.appendChild(inputArea);
    container.appendChild(sendButton);
    container.appendChild(outputArea);
    document.body.appendChild(container);
  
    // Close functionality
    closeButton.addEventListener('click', () => {
      container.remove();
    });
  
    // Send functionality
    sendButton.addEventListener('click', () => {
      const instructions = inputArea.value.trim();
      if (instructions) {
        // Здесь можно добавить логику обработки инструкций
        // Например, отправить их на сервер или обработать локально
        // Для примера просто выводим инструкции в outputArea
        const response = document.createElement('div');
        response.textContent = `Ответ: ${instructions}`;
        response.style.marginBottom = '10px';
        outputArea.appendChild(response);
        inputArea.value = '';
      }
    });
  
    // Dragging functionality
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
  
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - container.getBoundingClientRect().left;
      offsetY = e.clientY - container.getBoundingClientRect().top;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  
    function onMouseMove(e) {
      if (isDragging) {
        container.style.left = `${e.clientX - offsetX}px`;
        container.style.top = `${e.clientY - offsetY}px`;
        container.style.right = 'auto';
        container.style.bottom = 'auto';
      }
    }
  
    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  
    // Additional container style (additional CSS)
    const style = document.createElement('style');
    style.textContent = `
      /* Hide the scrollbar for outputArea */
      #response-output::-webkit-scrollbar {
        width: 6px;
      }
      #response-output::-webkit-scrollbar-thumb {
        background-color: rgba(0,0,0,0.2);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  })();
  