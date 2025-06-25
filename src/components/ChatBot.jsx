import React, { useState } from 'react';
import roomData from './Data/roomData.json'
import { Send, MapPin } from 'lucide-react';

function ChatBot() {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([
    { sender: 'bot', text: "Hi there! I can help you find locations on campus." },
    { sender: 'bot', text: `Available Bhavans: ${roomData.map(b => b.bhavan).join(', ')}` }
  ]);

  const findBhavan = (searchTerm) => {
    const lowerSearch = searchTerm.toLowerCase();
    
    // First try exact match
    const exactMatch = roomData.find(b => 
      b.bhavan.toLowerCase() === lowerSearch
    );
    if (exactMatch) return exactMatch;

    // Then try contains match
    const containsMatch = roomData.find(b => 
      b.bhavan.toLowerCase().includes(lowerSearch)
    );
    if (containsMatch) return containsMatch;

    // Then try fuzzy match (first letters)
    const fuzzyMatch = roomData.find(b => 
      b.bhavan.toLowerCase().split(' ').some(word => 
        word.startsWith(lowerSearch)
    ));
    if (fuzzyMatch) return fuzzyMatch;

    return null;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setChat(prev => [...prev, userMsg]);

    const found = findBhavan(input);

    setTimeout(() => {
      const botMsg = {
        sender: 'bot',
        text: found
          ? `📍 ${found.bhavan}\n\n${found.way}`
          : `Sorry, I couldn't find "${input}".\n\nAvailable Bhavans: ${roomData.map(b => b.bhavan).join(', ')}`
      };
      setChat(prev => [...prev, botMsg]);
    }, 500); // Small delay for better UX

    setInput('');
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-br from-indigo-50/50 to-purple-50/50 space-y-3">
        {chat.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.sender === 'bot'
                  ? 'bg-white border border-gray-200 rounded-tl-none text-gray-700'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-tr-none'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 focus:outline-none bg-gray-50"
            placeholder="Type a bhavan name or part of it..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Try partial names like: "Bill", "Vish", or "Raman"
        </p>
      </div>
    </div>
  );
}

export default ChatBot;