import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chatbot({ patients }) {
    const [selectedPatients, setSelectedPatients] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const togglePatientSelection = (patientId) => {
        setSelectedPatients(prev =>
            prev.includes(patientId)
                ? prev.filter(id => id !== patientId)
                : [...prev, patientId]
        );
    };

    const clearSelectedPatients = () => {
        setSelectedPatients([]);
    };

    const getSelectedPatientsData = () => {
        return patients.filter(p => selectedPatients.includes(p.patient_id));
    };

    const buildContextForGemini = () => {
        const selectedPatientsData = getSelectedPatientsData();

        if (selectedPatientsData.length === 0) {
            return "No patients selected. Please select patients to query about their medical information.";
        }

        let context = "Here is the medical information for the selected patient(s):\n\n";

        selectedPatientsData.forEach(patient => {
            context += `Patient age and gender:\n`;
            if (patient.phi?.age) context += `Age: ${patient.phi.age}\n`;
            if (patient.phi?.gender) context += `Gender: ${patient.phi.gender}\n`;

            // Aggregate all medical terms from all reports
            const allMedicalTerms = patient.reports
                .flatMap(r => r.extracted_data?.medical_terms || [])
                .filter((term, index, self) => self.indexOf(term) === index); // Remove duplicates

            if (allMedicalTerms.length > 0) {
                context += `Medical Terms Found: ${allMedicalTerms.join(', ')}\n`;
            }

            context += `\n`;
        });

        return context;
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = {
            role: 'user',
            content: inputMessage,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (!apiKey) {
                throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file.');
            }

            const context = buildContextForGemini();
            const prompt = `${context}\n\nUser Question: ${inputMessage}\n\nPlease provide a helpful and accurate response based on the patient medical information provided above. If the question cannot be answered with the available data, please state that clearly.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

            const assistantMessage = {
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chatbot Error:', error);
            const errorMessage = {
                role: 'assistant',
                content: `Error: ${error.message}`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const clearConversation = () => {
        setMessages([]);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">PulseCloud Chatbot</h2>
                            <p className="text-indigo-100">Ask questions about selected patients' medical information</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Patient Selection Bar */}
                <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold text-gray-700">Selected Patients:</span>
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                {selectedPatients.length}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {selectedPatients.length > 0 && (
                                <button
                                    onClick={clearSelectedPatients}
                                    className="text-sm text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear All
                                </button>
                            )}
                            <button
                                onClick={() => setShowPatientSelector(!showPatientSelector)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {showPatientSelector ? 'Hide' : 'Select'} Patients
                            </button>
                        </div>
                    </div>

                    {/* Selected Patients Display */}
                    {selectedPatients.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {getSelectedPatientsData().map(patient => (
                                <div
                                    key={patient.patient_id}
                                    className="bg-white border-2 border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{patient.phi?.name || `Patient ${patient.patient_id}`}</p>
                                        <p className="text-xs text-gray-500">ID: {patient.patient_id} • {patient.reportCount} report{patient.reportCount !== 1 ? 's' : ''}</p>
                                    </div>
                                    <button
                                        onClick={() => togglePatientSelection(patient.patient_id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Patient Selector Dropdown */}
                    {showPatientSelector && (
                        <div className="mt-3 bg-white border-2 border-indigo-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Available Patients:</h3>
                            {patients.length > 0 ? (
                                <div className="space-y-2">
                                    {patients.map(patient => (
                                        <label
                                            key={patient.patient_id}
                                            className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPatients.includes(patient.patient_id)}
                                                onChange={() => togglePatientSelection(patient.patient_id)}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {patient.phi?.name || `Patient ${patient.patient_id}`}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    ID: {patient.patient_id} • Age: {patient.phi?.age || 'N/A'} • {patient.reportCount} report{patient.reportCount !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No patients available</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-indigo-50">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-lg font-medium">Start a conversation</p>
                            <p className="text-sm mt-2">Select patients and ask questions about their medical information</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-3xl rounded-2xl px-5 py-3 ${message.role === 'user'
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                            : message.isError
                                                ? 'bg-red-50 border-2 border-red-200 text-red-800'
                                                : 'bg-white border-2 border-gray-200 text-gray-800 shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {message.role === 'assistant' && (
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                {message.role === 'assistant' ? (
                                                    <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${message.isError ? 'prose-red' : 'prose-gray'}`}>
                                                        <ReactMarkdown
                                                            components={{
                                                                // Customize heading styles
                                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2 text-gray-900" {...props} />,
                                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
                                                                h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 text-gray-900" {...props} />,
                                                                // Customize paragraph styles
                                                                p: ({ node, ...props }) => <p className="mb-2 text-gray-800" {...props} />,
                                                                // Customize list styles
                                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 text-gray-800" {...props} />,
                                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 text-gray-800" {...props} />,
                                                                li: ({ node, ...props }) => <li className="mb-1 text-gray-800" {...props} />,
                                                                // Customize code styles
                                                                code: ({ node, inline, ...props }) =>
                                                                    inline ? (
                                                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-700" {...props} />
                                                                    ) : (
                                                                        <code className="block bg-gray-100 p-2 rounded text-sm font-mono text-gray-800 overflow-x-auto" {...props} />
                                                                    ),
                                                                // Customize strong/bold styles
                                                                strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                                                                // Customize em/italic styles
                                                                em: ({ node, ...props }) => <em className="italic text-gray-800" {...props} />,
                                                                // Customize link styles
                                                                a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-800 underline" {...props} />,
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                )}
                                                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-3 shadow-md">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 bg-white p-4">
                    {messages.length > 0 && (
                        <div className="mb-3 flex justify-end">
                            <button
                                onClick={clearConversation}
                                className="text-sm text-gray-600 hover:text-gray-800 font-semibold flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear Conversation
                            </button>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={selectedPatients.length > 0 ? "Ask a question about the selected patient(s)..." : "Please select patients first..."}
                            disabled={isLoading || selectedPatients.length === 0}
                            rows="2"
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !inputMessage.trim() || selectedPatients.length === 0}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    Send
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
            </div>
        </div>
    );
}
