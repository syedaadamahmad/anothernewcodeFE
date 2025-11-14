'use client';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Image from "next/image";

export default function FlightCard({ flightData, bookingOptions }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [nestedChatOpen, setNestedChatOpen] = useState(null); // platform name of open chat
  const [chats, setChats] = useState({}); // stores messages per platform
  const [nestedInput, setNestedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef(null);

  // ✅ Auto-scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  // ✅ Format helpers
  const formatTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString || 'N/A';
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);

  // ✅ Handle booking option click (opens chat + sends initial AI greeting)
  const handleBookingOptionClick = (option) => {
    const platform = option.together?.book_with || "Unknown";
    const price = option.together?.price || 0;

    setSelectedOption({ platform, price, ...option });
    setNestedChatOpen(platform);

    const initialMsg = [{
      role: 'ai',
      content: `Great! You selected **${platform}** at ₹${price.toLocaleString()}.\n\nWould you like to see exclusive offers and combos for this flight? 💳✨`
    }];

    setChats(prev => ({ ...prev, [platform]: initialMsg }));
  };

  // ✅ Send nested chat message to backend
  const sendNestedMessage = async (contentOverride = null) => {
  const messageToSend = contentOverride ?? nestedInput;
  if (!messageToSend.trim() || isLoading || !selectedOption) return;

  const platform = selectedOption.platform;
  const prevMsgs = chats[platform] || [];
  const userMsg = { role: 'human', content: messageToSend };
  const updatedHistory = [...prevMsgs, userMsg];

  setChats(prev => ({ ...prev, [platform]: updatedHistory }));

  if (!contentOverride) setNestedInput(''); // only clear text input if manual send
  setIsLoading(true);

  try {
    const res = await fetch fetch('http://localhost:8000/chat/flight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_history: updatedHistory,
        flight_context: {
          platform: selectedOption.platform,
          base_price: selectedOption.price,
        },
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);


    const data = await res.json();
    setChats(prev => ({
      ...prev,
      [platform]: [
        ...updatedHistory,
        { role: 'ai', content: data.content || 'Let me help you find offers.' },
      ],
    }));
  } catch (err) {
    console.error('[NESTED_CHAT_ERROR]', err);
    setChats(prev => ({
      ...prev,
      [platform]: [
        ...updatedHistory,
        { role: 'ai', content: '⚠️ Error connecting to server. Please try again.' },
      ],
    }));
  } finally {
    setIsLoading(false);
  }
};


  // ✅ Exit if no flight data
  if (!flightData || flightData.length === 0) return null;
  const flight = flightData[0];
  const departureAirport = flight.departure_airport || {};
  const arrivalAirport = flight.arrival_airport || {};

  return (
    <Card className="w-full max-w-2xl mx-auto mb-4 shadow-lg">
      {/* ==== Flight Info Header ==== */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {flight.airline_logo && (
              <Image
                src={flight.airline_logo}
                alt={flight.airline || 'Airline'}
                width={40}
                height={40}
                className="rounded"
              />
            )}
            <div>
              <CardTitle className="text-lg font-semibold">{flight.airline || 'Unknown Airline'}</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                {flight.flight_number || 'N/A'} • {flight.airplane || 'Unknown Aircraft'}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Duration</div>
            <div className="font-semibold">
              {flight.duration ? formatDuration(flight.duration) : 'N/A'}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ==== Flight Timing Details ==== */}
      <CardContent className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {departureAirport.time ? formatTime(departureAirport.time) : 'N/A'}
            </div>
            <div className="text-sm font-semibold">{departureAirport.id || 'N/A'}</div>
            <div className="text-xs text-gray-500">{departureAirport.name || 'Unknown Airport'}</div>
          </div>

          <div className="flex-1 mx-4">
            <div className="relative">
              <div className="h-0.5 bg-gray-300"></div>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                ✈️
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {arrivalAirport.time ? formatTime(arrivalAirport.time) : 'N/A'}
            </div>
            <div className="text-sm font-semibold">{arrivalAirport.id || 'N/A'}</div>
            <div className="text-xs text-gray-500">{arrivalAirport.name || 'Unknown Airport'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Class:</span> {flight.travel_class || 'N/A'}</div>
          <div><span className="text-gray-500">Legroom:</span> {flight.legroom || 'N/A'}</div>
        </div>

        {flight.extensions && flight.extensions.length > 0 && (
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            {flight.extensions.map((extension, index) => (
              <div key={index}>• {extension}</div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ==== Booking Options Button ==== */}
      <CardFooter className="pt-3 border-t">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors duration-200 ${
            !bookingOptions?.length
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={!bookingOptions?.length}
        >
          {isExpanded ? 'Hide Booking Options' : `GET DEALS (${bookingOptions?.length || 0})`}
        </button>
      </CardFooter>

      {/* ==== Booking Options & Nested Chat ==== */}
      {isExpanded && (
        <div className="border-t bg-gray-50">
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-3">Booking Options</h3>
            {bookingOptions?.length > 0 ? (
              <div className="space-y-3">
                {bookingOptions.map((option, index) => {
                  const booking = option.together || {};
                  const platform = booking.book_with;

                  return (
                    <Card key={index} className="p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {booking.airline_logos?.[0] && (
                            <Image
                              src={booking.airline_logos[0]}
                              alt={platform || 'Partner'}
                              width={32}
                              height={32}
                              className="rounded"
                            />
                          )}
                          <div>
                            <div className="font-semibold">{platform || 'Unknown Partner'}</div>
                            <div className="text-sm text-gray-500">
                              {booking.marketed_as?.join(', ') || 'N/A'}
                            </div>
                            {booking.baggage_prices?.length > 0 && (
                              <div className="text-xs text-green-600">
                                {booking.baggage_prices.join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {booking.price ? formatPrice(booking.price) : 'Price N/A'}
                          </div>
                          <button
                            onClick={() => handleBookingOptionClick(option)}
                            className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1 px-3 rounded transition-colors duration-200"
                          >
                            GET DEALS
                          </button>
                        </div>
                      </div>

                      {/* ==== Nested Chat for this Platform ==== */}
                      <AnimatePresence>
                        {nestedChatOpen === platform && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-6 border-t pt-6"
                          >
                            <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl p-4 shadow-inner border">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  💬 Chat with {platform}
                                </h3>
                                <button
                                  onClick={() => {
                                    setNestedChatOpen(null);
                                    setSelectedOption(null);
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Chat Messages */}
                              <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-2">
                                {(chats[platform] || []).map((msg, i) => (
                                  <div key={i} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                      className={`max-w-[80%] rounded-2xl p-3 ${
                                        msg.role === 'human'
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-white border text-gray-800'
                                      }`}
                                    >
                                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                                     {msg.role === "ai" &&
  msg.content.includes("exclusive offers and combos") && (
    <div className="mt-3">
      <select
        onChange={(e) => {
          const selected = e.target.value;
          if (!selected) return;

          const platform = selectedOption?.platform;
          if (!platform) return;

          // 🧩 Append user selection to that platform’s chat
          setChats((prev) => {
            const prevMsgs = prev[platform] || [];
            const updated = [...prevMsgs, { role: "human", content: selected }];
            return { ...prev, [platform]: updated };
          });

          // 🧠 Send to backend as a new message
          sendNestedMessage(selected);

          // Disable dropdown after choosing
          e.target.disabled = true;
        }}
        defaultValue=""
        className="border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="" disabled>
          -- Select an Option --
        </option>
        <option value="Payment offers">💳 Show Payment offers</option>
        <option value="General offers">🎟️ Show General offers</option>
        <option value="View flight combos">✈️ View flight combos</option>
      </select>
    </div>
  )}
  {/* 💳 Bank selection dropdown */}
{msg.role === "ai" &&
  msg.content.includes("preferred bank") && (
    <div className="mt-3">
      <select
        onChange={(e) => {
          const selected = e.target.value;
          if (!selected) return;

          const platform = selectedOption?.platform;
          if (!platform) return;

          // Append the user's selected bank into this chat thread
          setChats((prev) => {
            const prevMsgs = prev[platform] || [];
            const updated = [...prevMsgs, { role: "human", content: selected }];
            return { ...prev, [platform]: updated };
          });

          // Send the selected bank to backend
          sendNestedMessage(selected);

          // Disable dropdown after choosing
          e.target.disabled = true;
        }}
        defaultValue=""
        className="border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="" disabled>
          -- Select Your Bank --
        </option>
        <option value="HDFC Bank">🏦 HDFC Bank</option>
        <option value="ICICI Bank">🏦 ICICI Bank</option>
        <option value="SBI">🏦 State Bank of India (SBI)</option>
        <option value="Axis Bank">🏦 Axis Bank</option>
        <option value="IDFC FIRST Bank">🏦 IDFC FIRST Bank</option>
        <option value="Kotak Mahindra Bank">🏦 Kotak Mahindra Bank</option>
        <option value="Yes Bank">🏦 Yes Bank</option>
        <option value="IndusInd Bank">🏦 IndusInd Bank</option>
        <option value="Bank of Baroda">🏦 Bank of Baroda</option>
        <option value="Punjab National Bank">🏦 Punjab National Bank</option>
        <option value="No preference">🤝 No preference</option>
      </select>
    </div>
  )}
{/* 💳 Credit/Debit card radio buttons */}
{msg.role === "ai" &&
  msg.content.toLowerCase().includes("credit card or debit card") && (
    <div className="mt-3 flex flex-col gap-2">
      {["Credit Card", "Debit Card"].map((cardType) => (
        <label
          key={cardType}
          className="flex items-center gap-2 border border-indigo-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-indigo-50 transition"
        >
          <input
            type="radio"
            name={`cardType-${msg.id || Math.random()}`}
            value={cardType}
            onChange={(e) => {
              const selected = e.target.value;
              const platform = selectedOption?.platform;
              if (!platform) return;

              // Add the user's selection to the chat
              setChats((prev) => {
                const prevMsgs = prev[platform] || [];
                const updated = [
                  ...prevMsgs,
                  { role: "human", content: selected },
                ];
                return { ...prev, [platform]: updated };
              });

              // Send selection to backend
              sendNestedMessage(selected);

              // Optionally disable further choices (make static after select)
              const allInputs = e.target
                .closest("div")
                .querySelectorAll("input");
              allInputs.forEach((i) => (i.disabled = true));
            }}
          />
          <span>{cardType === "Credit Card" ? "💳" : "🏦"} {cardType}</span>
        </label>
      ))}
    </div>
  )}
{/* 🎉 Combo Result Card */}
{/* 🎉 Combo Result Card */}
{msg.role === "ai" &&
  msg.content.includes("Best combo for") && (
    <div className="mt-4">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 shadow-md">
        {/* 🎯 Header */}
        <h3 className="text-lg font-bold text-indigo-700 mb-2">
          🎉 Best Combo Found!
        </h3>

        {/* ✈️ Platform Name */}
        <p className="text-sm text-gray-600 mb-3">
          {msg.content.match(/Best combo for (.*?):/)?.[1] || "Selected Platform"}
        </p>

        {/* 💰 Price Details */}
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-semibold text-gray-800">💰 Original Price:</span>{" "}
            <span className="text-gray-700">
              ₹{msg.content.match(/Original Price.*?₹([\d,]+)/)?.[1] || "--"}
            </span>
          </p>
          <p>
            <span className="font-semibold text-green-700">💰 After Offers:</span>{" "}
            <span className="text-green-700 font-semibold">
              ₹{msg.content.match(/After Offers.*?₹([\d,]+)/)?.[1] || "--"}
            </span>
          </p>
          <p>
            <span className="font-semibold text-indigo-700">
              ✅ SmartBhai Price:
            </span>{" "}
            <span className="text-indigo-700 font-bold">
              ₹{msg.content.match(/SmartBhai Price.*?₹([\d,]+)/)?.[1] || "--"}
            </span>
          </p>
        </div>

        {/* 💡 Offers List */}
        <div className="mt-4 bg-white rounded-xl p-3 border border-indigo-100">
          <h4 className="font-semibold text-gray-800 mb-2">🧾 Applied Offers:</h4>

          {msg.content
            .split("•")
            .slice(1)
            .map((line, i) => {
              const [title, ...details] = line.trim().split("└");
              return (
                <div
                  key={i}
                  className="mb-3 last:mb-0 border-l-4 border-indigo-400 pl-3"
                >
                  <p className="font-medium text-indigo-700">{title.replace(/\*\*/g, "").trim()}</p>
                  {details.map((d, j) => (
                    <p key={j} className="text-sm text-gray-600">
                      {d.replace(/[`*]/g, "").trim()}
                    </p>
                  ))}
                </div>
              );
            })}
        </div>

        {/* ✨ CTA */}
        <div className="mt-4 flex justify-end">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl shadow transition"
            onClick={() => alert("Proceeding with combo booking...")}
          >
            Proceed with Offer ✈️
          </button>
        </div>
      </div>
    </div>
  )}

  </div>
                                  </div>  
                                ))}
                                {isLoading && (
                                  <div className="flex justify-start">
                                    <div className="bg-white border rounded-2xl p-3 text-gray-500 animate-pulse">
                                      🤔 Thinking...
                                    </div>
                                  </div>
                                )}
                                <div ref={chatEndRef} />
                              </div>

                              {/* Input Box */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={nestedInput}
                                  onChange={(e) => setNestedInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      sendNestedMessage();
                                    }
                                  }}
                                  placeholder="Type your message..."
                                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  disabled={isLoading}
                                />
                                <button
                                  onClick={sendNestedMessage}
                                  disabled={isLoading || !nestedInput.trim()}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No booking options available.</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}








































// 'use client';

// import { useState, useRef, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import ReactMarkdown from 'react-markdown';

// export default function FlightCard({ flightData, bookingOptions }) {
//   const [showBookingOptions, setShowBookingOptions] = useState(false);
//   const [selectedOption, setSelectedOption] = useState(null);
//   const [nestedChatOpen, setNestedChatOpen] = useState(false);
//   const [nestedMessages, setNestedMessages] = useState([]);
//   const [nestedInput, setNestedInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
  
//   const chatEndRef = useRef(null);
  
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [nestedMessages]);
  
//   const formatTime = (isoString) => {
//     if (!isoString) return '';
//     return new Date(isoString).toLocaleTimeString('en-IN', { 
//       hour: '2-digit', minute: '2-digit' 
//     });
//   };
  
// const handleBookingOptionClick = (option) => {
//   const platform = option.together?.book_with || "Unknown";
//   const price = option.together?.price || 0;
  
//   setSelectedOption({ platform, price, ...option });
//   setNestedChatOpen(true);
  
//   // Initial assistant message
//   setNestedMessages([{
//     role: 'ai',
//     content: `Great! You selected ${platform} at ₹${price.toLocaleString()}.\n\nWould you like to see exclusive offers and combos for this flight? 💳✨`
//   }]);
// };
  
// const sendNestedMessage = async () => {
//   if (!nestedInput.trim() || isLoading) return;
  
//   const userMsg = { role: 'human', content: nestedInput };
//   const updatedHistory = [...nestedMessages, userMsg];
//   setNestedMessages(updatedHistory);
//   setNestedInput('');
//   setIsLoading(true);
  
//   try {
//     const res = await fetch('http://localhost:8000/chat/flight', { // ✅ Fixed endpoint
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//   chat_history: updatedHistory,
//   flight_context: {
//     platform: selectedOption.platform,
//     base_price: selectedOption.price
//   }
// })
//     });
    
//     if (!res.ok) throw new Error(`API error: ${res.status}`);
    
//     const data = await res.json();
//     setNestedMessages([...updatedHistory, {
//       role: 'ai',
//       content: data.content || 'Let me help you find offers.'
//     }]);
//   } catch (err) {
//     console.error('[NESTED_CHAT_ERROR]', err);
//     setNestedMessages([...updatedHistory, {
//       role: 'ai',
//       content: '⚠️ Error connecting to server. Please try again.'
//     }]);
//   } finally {
//     setIsLoading(false);
//   }
// };
  
//   if (!flightData || flightData.length === 0) return null;
  
//   const firstFlight = flightData[0];
//   const airline = firstFlight?.airline || 'Unknown';
//   const stops = flightData.length - 1;
  
//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-200"
//     >
//       {/* Flight Info */}
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center space-x-4">
//           <div className="text-2xl font-bold text-indigo-600">{airline}</div>
//           <div className="flex items-center space-x-2 text-gray-600">
//             <span className="font-semibold">
//               {formatTime(firstFlight?.departure_airport?.time)}
//             </span>
//             <span>→</span>
//             <span className="font-semibold">
//               {formatTime(firstFlight?.arrival_airport?.time)}
//             </span>
//           </div>
//         </div>
//         <div className="text-right">
//           <div className="text-sm text-gray-500">{firstFlight?.duration || 0}m</div>
//           <div className="text-xs text-gray-400">
//             {stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}
//           </div>
//         </div>
//       </div>
      
//       {/* Show Booking Options Button */}
//       <button
//         onClick={() => setShowBookingOptions(!showBookingOptions)}
//         disabled={!bookingOptions || bookingOptions.length === 0}
//         className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300"
//       >
//         {showBookingOptions ? 'Hide' : 'Show'} Booking Options ({bookingOptions?.length || 0})
//       </button>
      
//       {/* Booking Options */}
//       <AnimatePresence>
//         {showBookingOptions && bookingOptions && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: 'auto', opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             className="mt-4 space-y-2"
//           >
//             {bookingOptions.map((option, idx) => (
//               <div
//                 key={idx}
//                 onClick={() => handleBookingOptionClick(option)}
//                 className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-indigo-50 cursor-pointer"
//               >
//                 <div className="font-medium text-gray-800">{option.platform}</div>
//                 <div className="text-lg font-bold text-indigo-600">
//                   ₹{(option.together?.price || 0).toLocaleString()}
//                 </div>
//               </div>
//             ))}
//           </motion.div>
//         )}
//       </AnimatePresence>
      
//       {/* Nested Chat Dialog */}
//       <AnimatePresence>
//         {nestedChatOpen && selectedOption && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: 'auto', opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             className="mt-6 border-t pt-6"
//           >
//             <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl p-4">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-semibold text-gray-800">
//                   💬 Chat with {selectedOption.platform}
//                 </h3>
//                 <button
//                   onClick={() => {
//                     setNestedChatOpen(false);
//                     setNestedMessages([]);
//                   }}
//                   className="text-gray-400 hover:text-gray-600"
//                 >
//                   ✕
//                 </button>
//               </div>
              
//               {/* Chat Messages */}
//               <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
//                 {nestedMessages.map((msg, idx) => (
//                   <div
//                     key={idx}
//                     className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}
//                   >
//                     <div
//                       className={`max-w-[80%] rounded-2xl p-3 ${
//                         msg.role === 'human'
//                           ? 'bg-indigo-600 text-white'
//                           : 'bg-white border text-gray-800'
//                       }`}
//                     >
//                       <ReactMarkdown>{msg.content}</ReactMarkdown>
//                     </div>
//                   </div>
//                 ))}
//                 {isLoading && (
//                   <div className="flex justify-start">
//                     <div className="bg-white border rounded-2xl p-3 animate-pulse">
//                       Thinking...
//                     </div>
//                   </div>
//                 )}
//                 <div ref={chatEndRef} />
//               </div>
              
//               {/* Input Box */}
//               <div className="flex gap-2">
//                 <input
//                   type="text"
//                   value={nestedInput}
//                   onChange={(e) => setNestedInput(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === 'Enter' && !e.shiftKey) {
//                       e.preventDefault();
//                       sendNestedMessage();
//                     }
//                   }}
//                   placeholder="Type your message..."
//                   className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
//                   disabled={isLoading}
//                 />
//                 <button
//                   onClick={sendNestedMessage}
//                   disabled={isLoading || !nestedInput.trim()}
//                   className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
//                 >
//                   Send
//                 </button>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// }




































// // cc





// 'use client';

// import { useState, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

// export default function FlightCard({ flightData, bookingOptions }) {
//   const [showBookingOptions, setShowBookingOptions] = useState(false);

//   // ========================================
//   // Helper: Format Time & Duration
//   // ========================================
  
//   const formatTime = useCallback((isoString) => {
//     if (!isoString) return '';
//     const date = new Date(isoString);
//     return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
//   }, []);
  
//   const formatDuration = useCallback((minutes) => {
//     if (!minutes) return '';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return `${hours}h ${mins}m`;
//   }, []);
  
//   // ========================================
//   // Validation
//   // ========================================
  
//   if (!flightData || !Array.isArray(flightData) || flightData.length === 0) {
//     return null;
//   }

//   const firstFlight = flightData[0];
//   const lastFlight = flightData[flightData.length - 1];
  
//   const {
//     airline = 'Unknown',
//     airline_logo,
//     flight_number = '',
//     legroom = '',
//     airplane = '',
//     travel_class = '',
//     departure_airport,
//     arrival_airport,
//     duration
//   } = firstFlight;

//   const departureTime = departure_airport?.time;
//   const arrivalTime = lastFlight?.arrival_airport?.time;
//   const stops = flightData.length - 1;

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-200 hover:shadow-xl transition-shadow"
//     >
//       {/* ========================================
//           FLIGHT HEADER
//       ======================================== */}
//       <div className="flex items-start justify-between mb-4">
//         <div className="flex items-center gap-4">
//           {/* Airline Logo */}
//           {airline_logo && (
//             <img 
//               src={airline_logo} 
//               alt={airline}
//               className="w-12 h-12 object-contain"
//             />
//           )}
          
//           {/* Airline Info */}
//           <div>
//             <div className="text-xl font-bold text-gray-800">{airline}</div>
//             <div className="text-sm text-gray-500">{flight_number}</div>
//           </div>
//         </div>

//         {/* Flight Class Badge */}
//         {travel_class && (
//           <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
//             {travel_class}
//           </div>
//         )}
//       </div>

//       {/* ========================================
//           FLIGHT ROUTE
//       ======================================== */}
//       <div className="flex items-center justify-between mb-4 pb-4 border-b">
//         <div className="text-center">
//           <div className="text-2xl font-bold text-gray-800">
//             {formatTime(departureTime)}
//           </div>
//           <div className="text-sm text-gray-600 mt-1">
//             {departure_airport?.id}
//           </div>
//           <div className="text-xs text-gray-500">
//             {departure_airport?.name}
//           </div>
//         </div>

//         <div className="flex-1 mx-4 text-center">
//           <div className="text-sm text-gray-500 mb-1">
//             {formatDuration(duration)}
//           </div>
//           <div className="relative">
//             <div className="border-t-2 border-gray-300"></div>
//             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
//               <svg 
//                 className="w-5 h-5 text-gray-400" 
//                 fill="currentColor" 
//                 viewBox="0 0 20 20"
//               >
//                 <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
//               </svg>
//             </div>
//           </div>
//           <div className="text-xs text-gray-500 mt-1">
//             {stops === 0 ? 'Non-stop' : `${stops} ${stops === 1 ? 'stop' : 'stops'}`}
//           </div>
//         </div>

//         <div className="text-center">
//           <div className="text-2xl font-bold text-gray-800">
//             {formatTime(arrivalTime)}
//           </div>
//           <div className="text-sm text-gray-600 mt-1">
//             {lastFlight?.arrival_airport?.id}
//           </div>
//           <div className="text-xs text-gray-500">
//             {lastFlight?.arrival_airport?.name}
//           </div>
//         </div>
//       </div>

//       {/* ========================================
//           FLIGHT DETAILS
//       ======================================== */}
//       <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
//         {airplane && (
//           <div className="flex items-center gap-2 text-gray-600">
//             <span className="text-gray-400">✈️</span>
//             <span>{airplane}</span>
//           </div>
//         )}
        
//         {legroom && (
//           <div className="flex items-center gap-2 text-gray-600">
//             <span className="text-gray-400">💺</span>
//             <span>{legroom} legroom</span>
//           </div>
//         )}
//       </div>

//       {/* ========================================
//           BOOKING OPTIONS BUTTON
//       ======================================== */}
//       <button
//         onClick={() => setShowBookingOptions(prev => !prev)}
//         disabled={!bookingOptions || bookingOptions.length === 0}
//         className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
//       >
//         {showBookingOptions 
//           ? 'Hide Booking Options' 
//           : `Show ${bookingOptions?.length || 0} Booking Options`
//         }
//       </button>

//       {/* ========================================
//           BOOKING OPTIONS LIST
//       ======================================== */}
//       <AnimatePresence>
//         {showBookingOptions && bookingOptions && bookingOptions.length > 0 && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: 'auto', opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             transition={{ duration: 0.3 }}
//             className="mt-4 space-y-2 overflow-hidden"
//           >
//             <div className="text-sm font-semibold text-gray-700 mb-2">
//               Available on:
//             </div>
            
//             {bookingOptions.map((option, idx) => {
//               const platform = option.together?.book_with || 'Unknown';
//               const price = option.together?.price;
//               const logo = option.together?.airline_logos?.[0];

//               return (
//                 <div
//                   key={idx}
//                   className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
//                 >
//                   <div className="flex items-center gap-3">
//                     {/* Platform Logo */}
//                     {logo && (
//                       <img 
//                         src={logo} 
//                         alt={platform}
//                         className="w-10 h-10 object-contain"
//                       />
//                     )}
                    
//                     {/* Platform Name */}
//                     <div>
//                       <div className="font-semibold text-gray-800">{platform}</div>
//                       {option.together?.baggage_prices && (
//                         <div className="text-xs text-gray-500">
//                           {option.together.baggage_prices[0]}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* Price */}
//                   <div className="text-right">
//                     {price ? (
//                       <>
//                         <div className="text-2xl font-bold text-indigo-600">
//                           ₹{price.toLocaleString()}
//                         </div>
//                         <a
//                           href={option.together?.booking_request?.url || '#'}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="inline-block mt-2 bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
//                         >
//                           Book Now →
//                         </a>
//                       </>
//                     ) : (
//                       <div className="text-sm text-gray-500">Price unavailable</div>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}

//             {/* Sort Options */}
//             <div className="flex justify-end mt-3">
//               <button 
//                 onClick={() => {
//                   const sorted = [...bookingOptions].sort((a, b) => 
//                     (a.together?.price || Infinity) - (b.together?.price || Infinity)
//                   );
//                   // Note: You'd need to update parent state to actually sort
//                   console.log('Sorted:', sorted);
//                 }}
//                 className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
//               >
//                 Sort by Price ↕️
//               </button>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// }
































































































// // /**
// //  * FlightCard Component
// //  * 
// //  * Displays flight details with booking options and nested offer discovery chat.
// //  * Each card maintains isolated state for its own offer conversation.
// //  */

// 'use client';

// import { useState, useRef, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

// export default function FlightCard({ flight }) {
//   // ========================================
//   // State Management
//   // ========================================
  
//   const [showBookingOptions, setShowBookingOptions] = useState(false);
//   const [nestedChatOpen, setNestedChatOpen] = useState(false);
//   const [nestedChatMessages, setNestedChatMessages] = useState([]);
//   const [selectedPlatform, setSelectedPlatform] = useState(null);
//   const [basePrice, setBasePrice] = useState(0);
//   const [selectedBanks, setSelectedBanks] = useState([]);
//   const [selectedCardTypes, setSelectedCardTypes] = useState([]);
//   const [availableBanks, setAvailableBanks] = useState([]);
//   const [currentOffers, setCurrentOffers] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [chatStep, setChatStep] = useState('initial'); // FSM for chat flow
  
//   const chatEndRef = useRef(null);
//   const chatContainerRef = useRef(null);
  
//   // ========================================
//   // Auto-scroll Effect
//   // ========================================
  
//   useEffect(() => {
//     if (chatEndRef.current) {
//       chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
//     }
//   }, [nestedChatMessages]);
  
//   // ========================================
//   // Helper: Format Time
//   // ========================================
  
//   const formatTime = useCallback((isoString) => {
//     if (!isoString) return '';
//     const date = new Date(isoString);
//     return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
//   }, []);
  
//   const formatDuration = useCallback((minutes) => {
//     if (!minutes) return '';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return `${hours}h ${mins}m`;
//   }, []);
  
//   // ========================================
//   // Handler: Show Booking Options
//   // ========================================
  
//   const handleShowBookingOptions = useCallback(() => {
//     setShowBookingOptions(prev => !prev);
//   }, []);
  
//   // ========================================
//   // Handler: Select Platform (Opens Nested Chat)
//   // ========================================
  
//   const handlePlatformSelect = useCallback(async (platform, price) => {
//     console.log('[PLATFORM_SELECT]', { platform, price });
    
//     setSelectedPlatform(platform);
//     setBasePrice(price);
//     setNestedChatOpen(true);
//     setChatStep('ask_general_offers');
    
//     // Initial assistant message
//     setNestedChatMessages([
//       {
//         role: 'assistant',
//         content: `Great! You selected ${platform} at ₹${price.toLocaleString()}. Let me help you find the best discounts.`,
//         timestamp: new Date().toISOString()
//       },
//       {
//         role: 'assistant',
//         content: 'We have general offers available. Would you like to see them?',
//         timestamp: new Date().toISOString(),
//         buttons: ['Yes', 'No']
//       }
//     ]);
//   }, []);
  
//   // ========================================
//   // API: Search Offers
//   // ========================================
  
//   const searchOffers = useCallback(async (offerType, banks = [], cardTypes = []) => {
//     setIsLoading(true);
    
//     try {
//       const res = await fetch('/api/offers/search', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           query: 'discount offers',
//           offer_type: offerType,
//           platform: selectedPlatform,
//           banks: banks.length > 0 ? banks : undefined,
//           card_types: cardTypes.length > 0 ? cardTypes : undefined,
//           k: 5
//         })
//       });
      
//       if (!res.ok) {
//         throw new Error(`API error: ${res.status}`);
//       }
      
//       const data = await res.json();
//       console.log('[SEARCH_OFFERS_SUCCESS]', data);
      
//       if (data.offers && data.offers.length > 0) {
//         setCurrentOffers(prev => [...prev, ...data.offers]);
        
//         // Add assistant message with offers
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: `Found ${data.offers.length} ${offerType === 'go' ? 'general offers' : offerType === 'gc' ? 'gift coupons' : 'payment offers'}:`,
//             timestamp: new Date().toISOString(),
//             offers: data.offers
//           }
//         ]);
//       } else {
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: `Sorry, no ${offerType === 'go' ? 'general offers' : offerType === 'gc' ? 'gift coupons' : 'payment offers'} found for ${selectedPlatform}.`,
//             timestamp: new Date().toISOString()
//           }
//         ]);
//       }
//     } catch (err) {
//       console.error('[FETCH_OFFERS_ERR]', err);
//       setNestedChatMessages(prev => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: 'Error fetching offers. Please try again.',
//           timestamp: new Date().toISOString()
//         }
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedPlatform]);
  
//   // ========================================
//   // API: Fetch Available Banks
//   // ========================================
  
//   const fetchAvailableBanks = useCallback(async () => {
//     setIsLoading(true);
    
//     try {
//       const res = await fetch(`/api/offers/banks/${selectedPlatform}`);
      
//       if (!res.ok) {
//         throw new Error(`API error: ${res.status}`);
//       }
      
//       const data = await res.json();
//       console.log('[FETCH_BANKS_SUCCESS]', data);
      
//       setAvailableBanks(data.banks || []);
      
//       if (data.banks && data.banks.length > 0) {
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: 'Please select your bank(s):',
//             timestamp: new Date().toISOString(),
//             banks: data.banks
//           }
//         ]);
//       } else {
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: `Sorry, no payment offers available for ${selectedPlatform}.`,
//             timestamp: new Date().toISOString()
//           }
//         ]);
//         setChatStep('ask_combos');
//       }
//     } catch (err) {
//       console.error('[FETCH_BANKS_ERR]', err);
//       setNestedChatMessages(prev => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: 'Error fetching banks. Please try again.',
//           timestamp: new Date().toISOString()
//         }
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedPlatform]);
  
//   // ========================================
//   // API: Compute Combos
//   // ========================================
  
//   const computeCombos = useCallback(async (comboType) => {
//     if (currentOffers.length < 2) {
//       setNestedChatMessages(prev => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: 'Need at least 2 offers to create combos. Please select more offers first.',
//           timestamp: new Date().toISOString()
//         }
//       ]);
//       return;
//     }
    
//     setIsLoading(true);
    
//     try {
//       const offerIds = currentOffers.map(o => o.offer_id);
      
//       const res = await fetch('/api/offers/combos', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           base_price: basePrice,
//           offer_ids: offerIds,
//           combo_type: comboType
//         })
//       });
      
//       if (!res.ok) {
//         throw new Error(`API error: ${res.status}`);
//       }
      
//       const data = await res.json();
//       console.log('[COMPUTE_COMBOS_SUCCESS]', data);
      
//       if (data.combos && data.combos.length > 0) {
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: `Here are the top ${Math.min(3, data.combos.length)} combos for maximum savings:`,
//             timestamp: new Date().toISOString(),
//             combos: data.combos.slice(0, 3)
//           }
//         ]);
//       } else {
//         setNestedChatMessages(prev => [
//           ...prev,
//           {
//             role: 'assistant',
//             content: 'No valid combos found with the selected offers.',
//             timestamp: new Date().toISOString()
//           }
//         ]);
//       }
//     } catch (err) {
//       console.error('[COMPUTE_COMBOS_ERR]', err);
//       setNestedChatMessages(prev => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: 'Error computing combos. Please try again.',
//           timestamp: new Date().toISOString()
//         }
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [basePrice, currentOffers]);
  
//   // ========================================
//   // Chat Flow State Machine
//   // ========================================
  
//   const handleChatAction = useCallback((action, value) => {
//     console.log('[CHAT_ACTION]', { step: chatStep, action, value });
    
//     // Add user message
//     setNestedChatMessages(prev => [
//       ...prev,
//       {
//         role: 'user',
//         content: typeof value === 'string' ? value : action,
//         timestamp: new Date().toISOString()
//       }
//     ]);
    
//     // FSM transitions
//     switch (chatStep) {
//       case 'ask_general_offers':
//         if (action === 'Yes') {
//           searchOffers('go');
//           setChatStep('ask_gift_coupons');
//           setTimeout(() => {
//             setNestedChatMessages(prev => [
//               ...prev,
//               {
//                 role: 'assistant',
//                 content: 'Would you like to see gift coupons as well?',
//                 timestamp: new Date().toISOString(),
//                 buttons: ['Yes', 'No']
//               }
//             ]);
//           }, 500);
//         } else {
//           setChatStep('ask_gift_coupons');
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'Would you like to see gift coupons?',
//               timestamp: new Date().toISOString(),
//               buttons: ['Yes', 'No']
//             }
//           ]);
//         }
//         break;
      
//       case 'ask_gift_coupons':
//         if (action === 'Yes') {
//           searchOffers('gc');
//           setChatStep('ask_payment_offers');
//           setTimeout(() => {
//             setNestedChatMessages(prev => [
//               ...prev,
//               {
//                 role: 'assistant',
//                 content: 'Would you like to see bank-specific payment offers?',
//                 timestamp: new Date().toISOString(),
//                 buttons: ['Yes', 'No']
//               }
//             ]);
//           }, 500);
//         } else {
//           setChatStep('ask_payment_offers');
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'Would you like to see bank-specific payment offers?',
//               timestamp: new Date().toISOString(),
//               buttons: ['Yes', 'No']
//             }
//           ]);
//         }
//         break;
      
//       case 'ask_payment_offers':
//         if (action === 'Yes') {
//           fetchAvailableBanks();
//           setChatStep('select_banks');
//         } else {
//           setChatStep('ask_combos');
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'Would you like to see combo offers for maximum discount?',
//               timestamp: new Date().toISOString(),
//               buttons: ['Yes', 'No']
//             }
//           ]);
//         }
//         break;
      
//       case 'select_banks':
//         if (action === 'bank_select') {
//           setSelectedBanks(prev => {
//             const newBanks = prev.includes(value)
//               ? prev.filter(b => b !== value)
//               : [...prev, value];
//             return newBanks;
//           });
//         } else if (action === 'banks_done') {
//           if (selectedBanks.length === 0) {
//             setNestedChatMessages(prev => [
//               ...prev,
//               {
//                 role: 'assistant',
//                 content: 'Please select at least one bank.',
//                 timestamp: new Date().toISOString()
//               }
//             ]);
//           } else {
//             setChatStep('select_card_types');
//             setNestedChatMessages(prev => [
//               ...prev,
//               {
//                 role: 'assistant',
//                 content: 'Do you have a credit card, debit card, or both?',
//                 timestamp: new Date().toISOString(),
//                 cardTypes: ['Credit Card', 'Debit Card', 'Both']
//               }
//             ]);
//           }
//         }
//         break;
      
//       case 'select_card_types':
//         let cardTypes = [];
//         if (value === 'Credit Card') cardTypes = ['credit'];
//         else if (value === 'Debit Card') cardTypes = ['debit'];
//         else if (value === 'Both') cardTypes = ['credit', 'debit'];
        
//         setSelectedCardTypes(cardTypes);
//         searchOffers('po', selectedBanks, cardTypes);
        
//         setChatStep('ask_combos');
//         setTimeout(() => {
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'Would you like to see combo offers for maximum discount?',
//               timestamp: new Date().toISOString(),
//               buttons: ['Yes', 'No']
//             }
//           ]);
//         }, 500);
//         break;
      
//       case 'ask_combos':
//         if (action === 'Yes') {
//           setChatStep('select_combo_type');
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'Would you like combos with general offers or gift coupons?',
//               timestamp: new Date().toISOString(),
//               comboTypes: ['General Offers', 'Gift Coupons']
//             }
//           ]);
//         } else {
//           setChatStep('complete');
//           setNestedChatMessages(prev => [
//             ...prev,
//             {
//               role: 'assistant',
//               content: 'All done! You can review the offers above. Happy booking! ✈️',
//               timestamp: new Date().toISOString()
//             }
//           ]);
//         }
//         break;
      
//       case 'select_combo_type':
//         const comboType = value === 'General Offers' ? 'po_go' : 'gc_po';
//         computeCombos(comboType);
//         setChatStep('complete');
//         break;
      
//       default:
//         break;
//     }
//   }, [chatStep, selectedBanks, searchOffers, fetchAvailableBanks, computeCombos]);
  
//   // ========================================
//   // Render: Flight Details
//   // ========================================
  
//   if (!flight) {
//     return null;
//   }
  
//   const {
//     airline = 'Unknown',
//     departure_time,
//     arrival_time,
//     duration_minutes,
//     stops = 0,
//     booking_options = []
//   } = flight;
  
//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-200 hover:shadow-xl transition-shadow"
//     >
//       {/* Flight Info */}
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center space-x-4">
//           <div className="text-2xl font-bold text-indigo-600">{airline}</div>
//           <div className="flex items-center space-x-2 text-gray-600">
//             <span className="font-semibold">{formatTime(departure_time)}</span>
//             <span>→</span>
//             <span className="font-semibold">{formatTime(arrival_time)}</span>
//           </div>
//         </div>
//         <div className="text-right">
//           <div className="text-sm text-gray-500">{formatDuration(duration_minutes)}</div>
//           <div className="text-xs text-gray-400">
//             {stops === 0 ? 'Non-stop' : `${stops} ${stops === 1 ? 'stop' : 'stops'}`}
//           </div>
//         </div>
//       </div>
      
//       {/* Show Booking Options Button */}
//       <button
//         onClick={handleShowBookingOptions}
//         disabled={booking_options.length === 0}
//         className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
//       >
//         {showBookingOptions ? 'Hide Booking Options' : `Show Booking Options (${booking_options.length})`}
//       </button>
      
//       {/* Booking Options */}
//       <AnimatePresence>
//         {showBookingOptions && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: 'auto', opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             className="mt-4 space-y-2 overflow-hidden"
//           >
//             {booking_options.map((option, idx) => (
//               <div
//                 key={idx}
//                 onClick={() => handlePlatformSelect(option.platform, option.price_inr)}
//                 className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-all"
//               >
//                 <div className="font-medium text-gray-800">{option.platform}</div>
//                 <div className="text-lg font-bold text-indigo-600">
//                   ₹{option.price_inr?.toLocaleString()}
//                 </div>
//               </div>
//             ))}
//           </motion.div>
//         )}
//       </AnimatePresence>
      
//       {/* Nested Chat */}
//       <AnimatePresence>
//         {nestedChatOpen && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: 'auto', opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             className="mt-6 border-t pt-6 overflow-hidden"
//           >
//             <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl p-4">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-semibold text-gray-800">
//                   Offer Discovery - {selectedPlatform}
//                 </h3>
//                 <button
//                   onClick={() => setNestedChatOpen(false)}
//                   className="text-gray-400 hover:text-gray-600"
//                 >
//                   ✕
//                 </button>
//               </div>
              
//               {/* Chat Messages */}
//               <div
//                 ref={chatContainerRef}
//                 className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-2 custom-scrollbar"
//               >
//                 {nestedChatMessages.map((msg, idx) => (
//                   <ChatMessage
//                     key={idx}
//                     message={msg}
//                     onAction={handleChatAction}
//                     selectedBanks={selectedBanks}
//                     isLoading={isLoading}
//                   />
//                 ))}
//                 <div ref={chatEndRef} />
//               </div>
              
//               {/* Loading Indicator */}
//               {isLoading && (
//                 <div className="flex items-center justify-center py-2">
//                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
//                 </div>
//               )}
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// }

// // ========================================
// // ChatMessage Component
// // ========================================

// function ChatMessage({ message, onAction, selectedBanks, isLoading }) {
//   const isUser = message.role === 'user';
  
//   return (
//     <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
//       <div
//         className={`max-w-[80%] rounded-2xl p-3 ${
//           isUser
//             ? 'bg-indigo-600 text-white'
//             : 'bg-white border border-gray-200 text-gray-800'
//         }`}
//       >
//         <div className="text-sm">{message.content}</div>
        
//         {/* Action Buttons */}
//         {message.buttons && !isLoading && (
//           <div className="flex gap-2 mt-2">
//             {message.buttons.map((btn, idx) => (
//               <button
//                 key={idx}
//                 onClick={() => onAction(btn, btn)}
//                 className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
//               >
//                 {btn}
//               </button>
//             ))}
//           </div>
//         )}
        
//         {/* Bank Selection */}
//         {message.banks && !isLoading && (
//           <div className="mt-3 space-y-2">
//             <div className="flex flex-wrap gap-2">
//               {message.banks.map((bank, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => onAction('bank_select', bank)}
//                   className={`px-3 py-1 text-sm rounded-lg border transition-all ${
//                     selectedBanks.includes(bank)
//                       ? 'bg-indigo-600 text-white border-indigo-600'
//                       : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
//                   }`}
//                 >
//                   {bank}
//                 </button>
//               ))}
//             </div>
//             <button
//               onClick={() => onAction('banks_done')}
//               className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
//             >
//               Done
//             </button>
//           </div>
//         )}
        
//         {/* Card Type Selection */}
//         {message.cardTypes && !isLoading && (
//           <div className="flex flex-col gap-2 mt-2">
//             {message.cardTypes.map((cardType, idx) => (
//               <button
//                 key={idx}
//                 onClick={() => onAction('card_type_select', cardType)}
//                 className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
//               >
//                 {cardType}
//               </button>
//             ))}
//           </div>
//         )}
        
//         {/* Combo Type Selection */}
//         {message.comboTypes && !isLoading && (
//           <div className="flex flex-col gap-2 mt-2">
//             {message.comboTypes.map((comboType, idx) => (
//               <button
//                 key={idx}
//                 onClick={() => onAction('combo_type_select', comboType)}
//                 className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
//               >
//                 {comboType}
//               </button>
//             ))}
//           </div>
//         )}
        
//         {/* Offers Display */}
//         {message.offers && (
//           <div className="mt-3 space-y-2">
//             {message.offers.map((offer, idx) => (
//               <OfferCard key={idx} offer={offer} />
//             ))}
//           </div>
//         )}
        
//         {/* Combos Display */}
//         {message.combos && (
//           <div className="mt-3 space-y-3">
//             {message.combos.map((combo, idx) => (
//               <ComboCard key={idx} combo={combo} rank={idx + 1} />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ========================================
// // OfferCard Component
// // ========================================

// function OfferCard({ offer }) {
//   return (
//     <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
//       <div className="flex justify-between items-start mb-2">
//         <div className="font-semibold text-gray-800 text-sm">{offer.description}</div>
//         <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
//           {offer.discount_type === 'percentage'
//             ? `${offer.discount_value}% OFF`
//             : `₹${offer.discount_value} OFF`}
//         </div>
//       </div>
      
//       {offer.min_transaction > 0 && (
//         <div className="text-xs text-gray-600 mb-1">
//           Min transaction: ₹{offer.min_transaction}
//         </div>
//       )}
      
//       {offer.max_discount && (
//         <div className="text-xs text-gray-600 mb-1">
//           Max discount: ₹{offer.max_discount}
//         </div>
//       )}
      
//       {offer.terms && (
//         <details className="mt-2">
//           <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
//             Terms & Conditions
//           </summary>
//           <p className="text-xs text-gray-600 mt-1">{offer.terms}</p>
//         </details>
//       )}
//     </div>
//   );
// }

// // ========================================
// // ComboCard Component
// // ========================================

// function ComboCard({ combo, rank }) {
//   return (
//     <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
//       <div className="flex justify-between items-center mb-3">
//         <div className="flex items-center gap-2">
//           <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
//             {rank}
//           </div>
//           <div className="font-bold text-lg text-gray-800">
//             ₹{combo.final_price?.toLocaleString()}
//           </div>
//         </div>
//         <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
//           Save ₹{combo.total_discount?.toLocaleString()}
//         </div>
//       </div>
      
//       <div className="space-y-1 mb-3">
//         {combo.combo?.map((offer, idx) => (
//           <div key={idx} className="text-sm text-gray-700 flex items-start">
//             <span className="mr-2">✓</span>
//             <span>{offer}</span>
//           </div>
//         ))}
//       </div>
      
//       <div className="text-xs text-purple-600 font-semibold">
//         {combo.discount_percentage?.toFixed(1)}% total discount
//       </div>
      
//       {combo.breakdown && (
//         <details className="mt-2">
//           <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
//             View Breakdown
//           </summary>
//           <div className="mt-2 space-y-1">
//             {combo.breakdown.steps?.map((step, idx) => (
//               <div key={idx} className="text-xs text-gray-600">
//                 Step {step.step}: ₹{step.price_before} → ₹{step.price_after}
//                 {' '}(-₹{step.discount_applied})
//               </div>
//             ))}
//           </div>
//         </details>
//       )}
//     </div>
//   );
// }
