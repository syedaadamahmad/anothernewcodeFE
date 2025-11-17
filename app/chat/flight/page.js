'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { motion } from 'framer-motion';
import BoardingPassCard from '@/components/boardingpass';
import InfiniteScroll from '@/components/InfiniteScroll';
import Navbar from '@/components/Navbar';
import Header from '@/components/Header';
import FlightCard from '@/components/FlightCard';

/* ------------------------------------------------------
   Local storage key + expiry
-------------------------------------------------------*/
const FILTER_KEY = 'smartbhai_filters_v1';
const EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

/* ------------------------------------------------------
   Optimized Bubble Component
-------------------------------------------------------*/
function MessageBubble({ msg, isLastAI, filterRef, setShowDatePicker, setShowAirlineFilter, setShowPriceSlider, children }) {
  const isUser = msg.role === 'human';

  return (
    <div className="px-2">
      <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={`px-5 py-3 max-w-[86%] rounded-3xl shadow-lg backdrop-blur-lg border
            ${isUser
              ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-br-none shadow-indigo-300/30'
              : 'bg-white/95 text-gray-800 rounded-bl-none border-gray-200 shadow-gray-300/30'
            }
          `}
        >
          {!isUser && (
            <p className="text-xs text-indigo-500 font-semibold mb-1">SmartBhai • Flight Deals</p>
          )}

          <div className="leading-relaxed text-sm">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>

          {/* Quick Options: No Flights Found */}
          {isLastAI && msg.content?.toLowerCase().includes("couldn't find any flights") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div
                onClick={() => {
                  setShowDatePicker(true);
                  setShowAirlineFilter(false);
                  setShowPriceSlider(false);
                }}
                className="p-4 rounded-2xl bg-white border shadow-sm cursor-pointer hover:shadow-md hover:bg-indigo-50 transition"
              >
                <div className="text-xl">📅</div>
                <div className="font-semibold text-sm mt-1">Change Date</div>
                <p className="text-xs text-gray-500">Modify travel date</p>
              </div>

              <div
                onClick={() => {
                  setShowAirlineFilter(true);
                  setShowDatePicker(false);
                  setShowPriceSlider(false);
                }}
                className="p-4 rounded-2xl bg-white border shadow-sm cursor-pointer hover:shadow-md hover:bg-indigo-50 transition"
              >
                <div className="text-xl">✈️</div>
                <div className="font-semibold text-sm mt-1">Change Airline</div>
                <p className="text-xs text-gray-500">Select preferred airlines</p>
              </div>

              <div
                onClick={() => {
                  setShowPriceSlider(true);
                  setShowDatePicker(false);
                  setShowAirlineFilter(false);
                }}
                className="p-4 rounded-2xl bg-white border shadow-sm cursor-pointer hover:shadow-md hover:bg-indigo-50 transition"
              >
                <div className="text-xl">💰</div>
                <div className="font-semibold text-sm mt-1">Change Budget</div>
                <p className="text-xs text-gray-500">Set your range</p>
              </div>
            </div>
          )}

          {/* Only last AI message receives filter UI */}
          {isLastAI && !isUser && (
            <div ref={filterRef} className="mt-3">
              {children}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------
   Filter Card Wrapper
-------------------------------------------------------*/
function FilterCard({ children, className = '' }) {
  return (
    <div className={`mt-3 p-4 rounded-2xl border bg-white/90 shadow-lg backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------
   Slider Row
-------------------------------------------------------*/
function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-sm">{label}</label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-600 cursor-pointer"
      />
      <div className="text-center font-bold">₹{value.toLocaleString()}</div>
    </div>
  );
}

/* ------------------------------------------------------
   MAIN PAGE
-------------------------------------------------------*/
export default function Home() {
  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "👋 Hi! I'm your Flight Coupon Assistant. Ask me anything about flight offers!",
    },
  ]);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const filterRef = useRef(null);
  const flightRef = useRef(null);
  const processedMsgKeys = useRef(new Set());

  const [loading, setLoading] = useState(false);
  const [currentFlightData, setCurrentFlightData] = useState(null);

  // Filter visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAirlineFilter, setShowAirlineFilter] = useState(false);
  const [showPriceSlider, setShowPriceSlider] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showBoardingPass, setShowBoardingPass] = useState(false);
  const [pendingSearchPayload, setPendingSearchPayload] = useState(null);
const [bpSearching, setBpSearching] = useState(false);

  // Filtering values (UI state)
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [minBudget, setMinBudget] = useState(5000);
  const [maxBudget, setMaxBudget] = useState(50000);
  const [travelClass, setTravelClass] = useState('Economy');

  const [justSelectedFilter, setJustSelectedFilter] = useState(false);

  // Guard to prevent immediate re-saving after Clear Chat
  const [isClearing, setIsClearing] = useState(false);

  const availableAirlines = useMemo(() => [
    'No Preference',
    'Air India',
    'Vistara',
    'SpiceJet',
    'Akasa Air',
    'Go First',
    'IndiGo',
  ], []);

  /* ------------------------------------------------------
     Helpers: LocalStorage Save / Load with expiry
  -------------------------------------------------------*/
  function loadFiltersFromLocalStorage() {
    try {
      const savedRaw = localStorage.getItem(FILTER_KEY);
      if (!savedRaw) return null;
      const f = JSON.parse(savedRaw);

      // If savedAt exists and expired, remove and return null
      if (f.savedAt && Date.now() - f.savedAt > EXPIRY_MS) {
        localStorage.removeItem(FILTER_KEY);
        return null;
      }

      // Otherwise return the stored filters (without savedAt)
      return {
        date: f.date || '',
        airlines: Array.isArray(f.airlines) ? f.airlines : [],
        budget: f.budget || { min: 5000, max: 50000 },
        class: f.class || 'Economy',
      };
    } catch (e) {
      console.warn('Failed to load filters from localStorage', e);
      return null;
    }
  }

  function saveFiltersToLocalStorage(update = {}) {
    // Block saving while we are actively clearing to avoid immediate re-create
    if (isClearing) return;

    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');

      const newData = {
        date: saved.date || '',
        airlines: Array.isArray(saved.airlines) ? saved.airlines : [],
        budget: saved.budget || { min: 5000, max: 50000 },
        class: saved.class || 'Economy',
        ...update,
        savedAt: Date.now(),
      };

      localStorage.setItem(FILTER_KEY, JSON.stringify(newData));
    } catch (e) {
      console.warn('Failed to save filters to localStorage', e);
    }
  }

  /* ------------------------------------------------------
     Clear filters (used on refresh and on clear chat)
  -------------------------------------------------------*/
  function clearFiltersFromLocalStorage() {
    try {
      localStorage.removeItem(FILTER_KEY);
    } catch (e) {
      console.warn('Failed to remove filters from localStorage', e);
    }
  }

  /* ------------------------------------------------------
     Load saved filters on mount
     ALSO: clear on every refresh as requested by user (Option A)
  -------------------------------------------------------*/
  useEffect(() => {
    // ⛔ Per Option A: Clear on refresh
    clearFiltersFromLocalStorage();

    // Then attempt to load (this will usually be null because we cleared above,
    // but we keep logic robust in case behavior changes later)
    const f = loadFiltersFromLocalStorage();
    if (!f) return;

    if (f.date) setSelectedDate(f.date);
    if (Array.isArray(f.airlines)) setSelectedAirlines(f.airlines);
    if (f.budget) {
      if (typeof f.budget.min === 'number') setMinBudget(f.budget.min);
      if (typeof f.budget.max === 'number') setMaxBudget(f.budget.max);
    }
    if (f.class) setTravelClass(f.class);
  }, []);

  /* ------------------------------------------------------
     Periodic expiry check (in case page stays open)
  -------------------------------------------------------*/
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const raw = localStorage.getItem(FILTER_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.savedAt && Date.now() - s.savedAt > EXPIRY_MS) {
          localStorage.removeItem(FILTER_KEY);
        }
      } catch (e) {
        // ignore
      }
    }, 60 * 1000); // check every minute

    return () => clearInterval(id);
  }, []);

  /* ------------------------------------------------------
     ALWAYS scroll down after new messages
  -------------------------------------------------------*/
  // Update the message scroll effect to be less aggressive
useEffect(() => {
  // Only scroll if not showing boarding pass or filters
  if (!showBoardingPass && !showDatePicker && !showAirlineFilter && !showPriceSlider && !showClassPicker) {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(t);
  }
}, [messages, showBoardingPass, showDatePicker, showAirlineFilter, showPriceSlider, showClassPicker]);

// Remove or comment out the filter auto-scroll effect completely
// This prevents jumping up when filters appear

  /* ------------------------------------------------------
     Filter auto-scroll (only when AI asks for filter)
  -------------------------------------------------------*/
  useEffect(() => {
    if (justSelectedFilter) return; // ⛔ Block upward scroll

    if (showDatePicker || showAirlineFilter || showPriceSlider || showClassPicker) {
      const t = setTimeout(() => {
        filterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [showDatePicker, showAirlineFilter, showPriceSlider, showClassPicker, justSelectedFilter]);

  /* ------------------------------------------------------
     Scroll to flight section
  -------------------------------------------------------*/
  useEffect(() => {
    if (!currentFlightData) return;

    const t = setTimeout(() => {
      flightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    return () => clearTimeout(t);
  }, [currentFlightData]);

  /* ------------------------------------------------------
     Detect when AI is asking for filters
  -------------------------------------------------------*/
  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'ai') return;

    const key = (lastMsg.content || '').slice(0, 200);
    if (processedMsgKeys.current.has(key)) return;
    processedMsgKeys.current.add(key);

    const content = (lastMsg.content || '').toLowerCase() || '';

    const showDate = /(what|which).*date|departure date|travel date|when.*travel/.test(content);
    // Airline filter should appear ONLY WHEN user is asked to CHOOSE airline
    const showAirline =
      /(preferred airline|which airline|choose airline)/.test(content) &&
      !/no specific airline preference/.test(content);
    // Block budget filter when user says: "My budget is ₹5000 - ₹50000"
    // inside the useEffect that inspects the AI message content
    const preventBudget = /(?:my budget is|my budget's|budget is|your budget is|your budget's|you've set a budget of|budget between|a budget between|budget range|budget of up to|budget up to|budget up to|up to | budget is between | with a maximum price )\s*₹?\s*[\d,]+/i.test(content);

    // Detect budget request normally
    const budgetRequest = /(maximum budget|price range|max price|budget)/.test(content);

    // Final condition: only show slider if AI actually asks AND user is not giving the budget already
    const showPrice = !preventBudget && budgetRequest;
    const showClass = /(which class|travel class|economy|business|cabin class)/.test(content);

    setShowDatePicker(showDate);
    setShowAirlineFilter(showAirline);
    setShowPriceSlider(showPrice);
    setShowClassPicker(showClass);
  }, [messages]);

  /* ------------------------------------------------------
     Send user message
  -------------------------------------------------------*/
  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: 'human', content: input.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');

    await sendMessageAutomatically(newMessages);
  }

  /* ------------------------------------------------------
     Backend request
  -------------------------------------------------------*/
  // In your Home component, update the sendMessageAutomatically function:

async function sendMessageAutomatically(history) {
  setLoading(true);
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_history: history }),
    });

    const data = await res.json();

    // ✅ ALWAYS show boarding pass when flight_data exists OR when "couldn't find" message
    const noFlightsFound = data.content?.toLowerCase().includes("couldn't find any flights");
    
    if (data.flight_data) {
      // Flights found → show boarding pass with results
      setPendingSearchPayload(data.flight_data);
      setShowBoardingPass(true);
      setMessages([...history, { role: 'ai', content: data.content }]);
      return;
    }else if (noFlightsFound) {
  setCurrentFlightData(null);
  setPendingSearchPayload(null);
  setShowBoardingPass(true);

  // ❌ DO NOT SHOW THE AI MESSAGE
  setMessages(history);

  return;
}

    // Normal message (no flight search)
    setMessages([...history, { role: 'ai', content: data.content }]);
    setJustSelectedFilter(false);

  } catch (err) {
    setMessages((prev) => [...prev, { role: 'ai', content: '⚠️ Error connecting to server.' }]);
  }

  setLoading(false);
}

  /* ------------------------------------------------------
     Send filter quick responses
  -------------------------------------------------------*/
  function sendFilterResponse(response) {
  const userMessage = { role: 'human', content: response };
  const newMessages = [...messages, userMessage];

  // PREVENT UPWARD SCROLL
  setJustSelectedFilter(true);

  // Start loading BEFORE backend call
  setLoading(true);

  // Clear filter boxes first
  setShowDatePicker(false);
  setShowAirlineFilter(false);
  setShowPriceSlider(false);
  setShowClassPicker(false);

  setMessages(newMessages);

  // Backend call
  sendMessageAutomatically(newMessages);
}

  /* ------------------------------------------------------
     UI Handlers
  -------------------------------------------------------*/
  function handleTextareaChange(e) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }

  function handleAirlineChange(airline) {
    if (airline === 'No Preference') {
      setSelectedAirlines(['No Preference']);
      // saveFiltersToLocalStorage respects isClearing
      saveFiltersToLocalStorage({ airlines: ['No Preference'] });
      return;
    }

    setSelectedAirlines((prev) => {
      const filtered = prev.filter((a) => a !== 'No Preference');
      let next;
      if (filtered.includes(airline)) next = filtered.filter((a) => a !== airline);
      else next = [...filtered, airline];

      // saveFiltersToLocalStorage respects isClearing
      saveFiltersToLocalStorage({ airlines: next });
      return next;
    });
  }

  function handleClearChat() {
    // Prevent auto-saving while we perform the clear + reset sequence
    setIsClearing(true);

    // Remove localStorage immediately
    clearFiltersFromLocalStorage();

    // Reset chat and UI
    setMessages([
      {
        role: 'ai',
        content: "👋 Hi! I'm your Flight Coupon Assistant. Ask me anything about flight offers!",
      },
    ]);

    setCurrentFlightData(null);
    processedMsgKeys.current.clear();

    // Reset visible selections to defaults
    setSelectedDate('');
    setSelectedAirlines([]);
    setMinBudget(5000);
    setMaxBudget(50000);
    setTravelClass('Economy');

    // Small delay to ensure any in-flight state updates finish
    // and we avoid immediate re-saving
    setTimeout(() => {
      setIsClearing(false);
    }, 300);
  }

  /* ------------------------------------------------------
     Render
  -------------------------------------------------------*/
  return (
    <main className="flex flex-col h-[calc(100dvh-64px)] mx-1.5">
      <Header onClearChat={handleClearChat} />

      <div className="flex-grow overflow-y-auto bg-gradient-to-b from-indigo-50 to-blue-50">
        <Navbar />
        <InfiniteScroll />

        <div className="flex flex-col mx-auto max-w-4xl p-6 pb-40">
          {/* Chat */}
          <div className="space-y-6 mb-6">
            <div className="space-y-2">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  msg={msg}
                  isLastAI={msg.role === 'ai' && idx === messages.length - 1}
                  filterRef={filterRef}
                  setShowDatePicker={setShowDatePicker}
                  setShowAirlineFilter={setShowAirlineFilter}
                  setShowPriceSlider={setShowPriceSlider}
                >

                  {/* Date Picker */}
                  {showDatePicker && (
                    <FilterCard>
                      <h3 className="font-semibold mb-2">📅 Select Travel Date</h3>
                      <input
                        type="date"
                        className="w-full border rounded p-2 mb-2"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          saveFiltersToLocalStorage({ date: e.target.value });
                          sendFilterResponse(`My travel date is ${e.target.value}`);
                        }}
                      />
                    </FilterCard>
                  )}

                  {/* Airline Picker */}
                  {showAirlineFilter && (
                    <FilterCard>
                      <h3 className="font-semibold mb-2">✈️ Preferred Airlines</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {availableAirlines.map((airline) => (
                          <label
                            key={airline}
                            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${selectedAirlines.includes(airline) ? 'bg-indigo-50 border' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-green-600"
                              checked={selectedAirlines.includes(airline)}
                              onChange={() => handleAirlineChange(airline)}
                            />
                            <span className="text-sm font-medium">{airline}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-3">
                        <button
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg"
                          onClick={() => {
                            const response = selectedAirlines.includes('No Preference')
                              ? 'No preference'
                              : `I prefer ${selectedAirlines.join(', ')}`;

                            // Ensure stored value is correct
                            saveFiltersToLocalStorage({ airlines: selectedAirlines.includes('No Preference') ? ['No Preference'] : selectedAirlines });

                            sendFilterResponse(response);
                          }}
                        >
                          Confirm
                        </button>

                        <button
                          className="flex-1 bg-gray-200 px-4 py-2 rounded-lg"
                          onClick={() => {
                            setSelectedAirlines([]);
                            saveFiltersToLocalStorage({ airlines: [] });
                            sendFilterResponse('No preference');
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </FilterCard>
                  )}

                  {/* Budget Slider */}
                  {showPriceSlider && (
                    <FilterCard className="max-w-xl mx-auto">
                      <h3 className="font-semibold mb-3 text-center">💰 Budget Range</h3>

                      <SliderRow
                        label="Minimum Budget"
                        value={minBudget}
                        min={1000}
                        max={49000}
                        step={500}
                        onChange={(v) => v < maxBudget && setMinBudget(v)}
                      />

                      <SliderRow
                        label="Maximum Budget"
                        value={maxBudget}
                        min={2000}
                        max={50000}
                        step={1000}
                        onChange={(v) => v > minBudget && setMaxBudget(v)}
                      />

                      <div className="flex gap-3 mt-4">
                        <button
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg"
                          onClick={() => {
                            saveFiltersToLocalStorage({ budget: { min: minBudget, max: maxBudget } });
                            sendFilterResponse(`My budget is ₹${minBudget} - ₹${maxBudget}`);
                          }}
                        >
                          Confirm
                        </button>

                        <button
                          className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg"
                          onClick={() => {
                            saveFiltersToLocalStorage({ budget: { min: 0, max: 'no-limit' } });
                            sendFilterResponse('No limit');
                          }}
                        >
                          No Limit
                        </button>
                      </div>
                    </FilterCard>
                  )}

                  {/* Class Picker */}
                  {showClassPicker && (
                    <FilterCard>
                      <h3 className="font-semibold mb-2">✈️ Choose Cabin Class</h3>
                      <select
                        value={travelClass}
                        onChange={(e) => setTravelClass(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm mb-3"
                      >
                        <option>Economy</option>
                        <option>Premium Economy</option>
                        <option>Business</option>
                        <option>First</option>
                      </select>

                      <div className="flex gap-3">
                        <button
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg"
                          onClick={() => {
                            saveFiltersToLocalStorage({ class: travelClass });
                            sendFilterResponse(`I prefer ${travelClass} class`);
                          }}
                        >
                          Confirm
                        </button>

                        <button
                          className="flex-1 bg-gray-200 px-4 py-2 rounded-lg"
                          onClick={() => {
                            setTravelClass('Economy');
                            saveFiltersToLocalStorage({ class: 'Economy' });
                            sendFilterResponse('Economy');
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </FilterCard>
                  )}
                </MessageBubble>
              ))}

              {/* Loading bubble */}
              {loading &&(!showBoardingPass && !bpSearching) &&  (
                <div className="flex justify-start px-3">
                  <div className="px-5 py-3 rounded-3xl bg-white shadow border animate-pulse text-gray-700">
                    ✈️ Finding the best flight offers...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
            {showBoardingPass && (
              // inside your Home component render method (replace the boarding pass block)
              <BoardingPassCard
                show={showBoardingPass}
                onClose={() => setShowBoardingPass(false)}
                 setBpSearching={setBpSearching}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                selectedAirlines={selectedAirlines} setSelectedAirlines={setSelectedAirlines}
                minBudget={minBudget} setMinBudget={setMinBudget}
                maxBudget={maxBudget} setMaxBudget={setMaxBudget}
                travelClass={travelClass} setTravelClass={setTravelClass}
                pendingSearchPayload={pendingSearchPayload}
                setCurrentFlightData={setCurrentFlightData}
                sendMessageAutomatically={sendMessageAutomatically}
                messages={messages} setMessages={setMessages}
                availableAirlines={availableAirlines}
              />
            )}

            {/* Flight Results */}
            <div ref={flightRef} className="w-full mt-6">
              {currentFlightData && !showBoardingPass && (
                <div className="mt-4 space-y-4">
                  <h2 className="text-xl font-bold text-indigo-700 px-3 mb-2">✈️ Best Flights Found</h2>

                  {currentFlightData.map((flightGroup, idx) => (
                    <FlightCard
                      key={idx}
                      flightData={flightGroup.flight_data}
                      bookingOptions={flightGroup.booking_options}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input Box */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t shadow-lg pt-2">
  <div className="max-w-4xl mx-auto flex gap-3 py-3 px-3">
              <textarea
                className="flex-1 bg-white border px-4 py-3 rounded-2xl shadow-sm resize-none text-sm"
                placeholder="Ask SmartBhai anything…"
                rows={1}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                className={`rounded-full p-3 shadow-lg transition ${loading || !input.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                <Image src="/icons/submit.svg" width={26} height={26} alt="send" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
