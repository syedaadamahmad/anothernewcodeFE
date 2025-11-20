'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FlightCard.Premium.jsx
 * Premium glassmorphic FlightCard (Option A style)
 * - Tailwind-first, mobile-first
 * - Glassmorphism, frosted backdrop, large rounded corners
 * - Subtle motion with framer-motion
 * - Accessible controls and improved chat/booking micro-interactions
 *
 * Props:
 *  - flightData: array (keeps original shape, uses flightData[0])
 *  - bookingOptions: array
 *
 * Drop-in replacement for your existing FlightCard with nicer visuals.
 */

export default function FlightCardPremium({ flightData, bookingOptions }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [nestedChatOpen, setNestedChatOpen] = useState(null);
  const [chats, setChats] = useState({});
  const [nestedInput, setNestedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chats, isLoading, nestedChatOpen]);

  // formatting helpers
  const formatTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString || 'N/A';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(
      price ?? 0
    );

  // nested chat handlers
  const handleBookingOptionClick = (option) => {
    const platform = option.together?.book_with || 'Partner';
    const price = option.together?.price || 0;
    setSelectedOption({ platform, price, ...option });
    setNestedChatOpen(platform);

    const initialMsg = [
      {
        role: 'ai',
        content: `Great choice — **${platform}** selected at ₹${price?.toLocaleString() || price}. Would you like me to show payment offers, combos, or helpful tips?`,
      },
    ];
    setChats((prev) => ({ ...prev, [platform]: initialMsg }));
  };

  const sendNestedMessage = async (contentOverride = null) => {
    const messageToSend = contentOverride ?? nestedInput;
    if (!messageToSend.trim() || isLoading || !selectedOption) return;

    const platform = selectedOption.platform;
    const prevMsgs = chats[platform] || [];
    const userMsg = { role: 'human', content: messageToSend };
    const updatedHistory = [...prevMsgs, userMsg];

    setChats((prev) => ({ ...prev, [platform]: updatedHistory }));
    if (!contentOverride) setNestedInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URLS}/chat/flight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_history: updatedHistory, flight_context: { platform: selectedOption.platform, base_price: selectedOption.price } }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      setChats((prev) => ({ ...prev, [platform]: [...updatedHistory, { role: 'ai', content: data.content || 'Here are some options.' }] }));
    } catch (err) {
      console.error('[NESTED_CHAT_ERROR]', err);
      setChats((prev) => ({ ...prev, [platform]: [...updatedHistory, { role: 'ai', content: '⚠️ Could not reach server. Try again.' }] }));
    } finally {
      setIsLoading(false);
    }
  };

  // combo parser (same spirit as original)
  const parseComboMessage = (msg) => {
    try {
      return {
        platform: msg.match(/Best combo for (.*?):/)?.[1]?.trim() || '',
        original: msg.match(/Original Price.*?₹([\d,]+)/)?.[1]?.replace(/,/g, '') || '',
        afterOffers: msg.match(/After Offers.*?₹([\d,]+)/)?.[1]?.replace(/,/g, '') || '',
        smartbhai: msg.match(/SmartBhai Price.*?₹([\d,]+)/)?.[1]?.replace(/,/g, '') || '',
        offers: msg
          .split('•')
          .slice(1)
          .map((block) => {
            const [title, ...details] = block.trim().split('└');
            return { title: title?.trim(), details: details.map((d) => d.trim()) };
          }),
      };
    } catch (e) {
      console.error('Combo parsing failed', e);
      return null;
    }
  };

  const RenderDynamicComboUI = ({ combo }) => {
    if (!combo) return null;
    return (
      <div className="mt-4">
        <div className="bg-white/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">🎉 Best Combo — {combo.platform}</h3>
              <p className="text-sm text-gray-700 mt-1">Smart savings applied automatically.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Now</div>
              <div className="font-extrabold text-2xl text-emerald-600">₹{combo.smartbhai || combo.afterOffers || combo.original}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-sm text-gray-800 space-y-1">
              <div>
                <span className="text-gray-500">Original:</span> ₹{combo.original || 'N/A'}
              </div>
              <div>
                <span className="text-gray-500">After Offers:</span> ₹{combo.afterOffers || 'N/A'}
              </div>
            </div>

            <div className="bg-white/40 rounded-xl p-3 border border-white/10">
              <h4 className="font-medium text-sm mb-2">🧾 Applied Offers</h4>
              <div className="space-y-2">
                {combo.offers?.map((offer, i) => (
                  <div key={i} className="border-l-4 border-emerald-300 pl-3">
                    <div className="font-medium text-sm">{offer.title}</div>
                    {offer.details?.map((d, j) => (
                      <div key={j} className="text-xs text-gray-700">{d}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => alert('Combo applied!')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
            >
              Apply Offer ✈️
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!flightData || flightData.length === 0) return null;
  const flight = flightData[0];
  const departureAirport = flight.departure_airport || {};
  const arrivalAirport = flight.arrival_airport || {};

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[980px] mx-auto my-6 p-1 rounded-3xl"
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-white/50 to-white/30 border border-white/10 shadow-2xl">
        {/* Luxury top glow */}
        <div className="absolute -top-10 -left-20 w-72 h-72 bg-gradient-to-tr from-indigo-200/30 via-transparent to-rose-200/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card content layout */}
        <div className="p-5 md:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-16 h-16 rounded-3xl bg-white/30 backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden shadow-sm">
                {flight.airline_logo ? (
                  <Image src={flight.airline_logo} alt={flight.airline || 'Airline'} width={64} height={64} className="object-contain" />
                ) : (
                  <div className="text-sm font-semibold text-gray-700">{flight.airline || 'Airline'}</div>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-semibold leading-tight truncate">{flight.airline || 'Unknown Airline'}</h2>
                <p className="text-sm text-gray-600 truncate">{flight.flight_number || '—'} • {flight.airplane || 'Aircraft'}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Duration</div>
              <div className="font-semibold text-gray-900">{formatDuration(flight.duration)}</div>
            </div>
          </div>

          {/* flight times */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <div className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-extrabold">{departureAirport.time ? formatTime(departureAirport.time) : 'N/A'}</div>
              <div className="text-sm font-semibold text-gray-700 mt-1">{departureAirport.id || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">{departureAirport.name || 'Unknown Airport'}</div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-36 h-12 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-0.5 w-full bg-gray-200 rounded" />
                </div>
                <div className="relative z-10 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow">✈️</div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="text-2xl md:text-3xl font-extrabold">{arrivalAirport.time ? formatTime(arrivalAirport.time) : 'N/A'}</div>
              <div className="text-sm font-semibold text-gray-700 mt-1">{arrivalAirport.id || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">{arrivalAirport.name || 'Unknown Airport'}</div>
            </div>
          </div>

          {/* small specs */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Class: </span>
              <span className="font-medium">{flight.travel_class || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Legroom: </span>
              <span className="font-medium">{flight.legroom || 'N/A'}</span>
            </div>
            {/* <div className="text-right md:text-left md:col-span-1">
              <span className="text-gray-500">Price:</span>
              <div className="font-extrabold text-xl text-emerald-600">{flight.price ? formatPrice(flight.price) : '—'}</div>
            </div> */}
          </div>

          {flight.extensions && flight.extensions.length > 0 && (
            <div className="mt-4 text-xs text-gray-600 space-y-1">
              {flight.extensions.map((ex, idx) => (
                <div key={idx}>• {ex}</div>
              ))}
            </div>
          )}
        </div>

        {/* footer area */}
        <div className="border-t border-white/10 bg-gradient-to-b from-white/20 to-white/10 p-4 md:p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-600">Compare prices across partners for the best deal.</div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsExpanded((s) => !s)}
                className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-3xl text-sm font-semibold transition-shadow transform hover:-translate-y-0.5 shadow-lg ${bookingOptions?.length ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                disabled={!bookingOptions?.length}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Hide Booking Options' : `GET DEALS (${bookingOptions?.length || 0})`}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="mt-4"
              >
                <div className="max-w-[95vw] md:max-w-full mx-auto">
                  <h3 className="text-base md:text-lg font-semibold mb-4">Booking Options</h3>

                  {bookingOptions?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {bookingOptions.map((option, index) => {
                        const booking = option.together || {};
                        const platform = booking.book_with || 'Partner';

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="bg-white/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-inner hover:shadow-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden border border-white/8">
                                {booking.airline_logos?.[0] ? (
                                  <Image src={booking.airline_logos[0]} alt={platform} width={44} height={44} className="object-contain" />
                                ) : (
                                  <div className="text-xs text-gray-700 font-medium">{platform}</div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">{platform}</div>
                                <div className="text-xs text-gray-600 truncate">{booking.marketed_as?.join(', ') || '—'}</div>
                                {booking.baggage_prices?.length > 0 && <div className="text-xs text-emerald-700 mt-1">{booking.baggage_prices.join(' • ')}</div>}
                              </div>

                              <div className="ml-auto flex items-center gap-3">
                                <div className="text-lg md:text-xl font-extrabold text-emerald-600">{booking.price ? formatPrice(booking.price) : 'Price N/A'}</div>

                                <button
                                  onClick={() => handleBookingOptionClick(option)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-semibold shadow hover:brightness-105"
                                >
                                  GET DEALS
                                </button>
                              </div>
                            </div>

                            {/* nested chat area */}
                            <AnimatePresence>
                              {nestedChatOpen === booking.book_with && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22 }}
                                  className="w-full mt-5 md:mt-4 order-last"
                                >
                                  <div className="bg-white/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-inner">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="text-sm font-semibold">💬 Chat with {booking.book_with}</div>
                                      <button
                                        onClick={() => {
                                          setNestedChatOpen(null);
                                          setSelectedOption(null);
                                        }}
                                        aria-label="Close chat"
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        ✕
                                      </button>
                                    </div>

                                    <div ref={containerRef} className="space-y-3 max-h-[300px] md:max-h-[360px] overflow-y-auto mb-3 p-2">
                                      {(chats[booking.book_with] || []).map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                                          <div
                                            className={`max-w-[82%] md:max-w-[75%] rounded-2xl px-4 py-2 leading-snug shadow-sm ${msg.role === 'human' ? 'bg-indigo-700 text-white' : 'bg-white/90 border border-gray-100 text-gray-800'
                                              }`}
                                          >
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>

                                            {/* interactive hooks */}
                                            {msg.role === 'ai' && msg.content.includes('show payment offers, combos') && (
                                              <div className="mt-3">
                                                <select
                                                  onChange={(e) => {
                                                    const selected = e.target.value;
                                                    if (!selected) return;
                                                    const platformKey = selectedOption?.platform;
                                                    if (!platformKey) return;

                                                    setChats((prev) => {
                                                      const prevMsgs = prev[platformKey] || [];
                                                      const updated = [...prevMsgs, { role: 'human', content: selected }];
                                                      return { ...prev, [platformKey]: updated };
                                                    });

                                                    sendNestedMessage(selected);
                                                    e.target.disabled = true;
                                                  }}
                                                  defaultValue=""
                                                  className="mt-2 w-full md:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm"
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

                                            {msg.role === 'ai' && msg.content.includes('HDFC, ICICI, SBI, Axis, IDFC') && (
                                              <div className="mt-3">
                                                <select
                                                  onChange={(e) => {
                                                    const selected = e.target.value;
                                                    if (!selected) return;
                                                    const platformKey = selectedOption?.platform;
                                                    if (!platformKey) return;

                                                    setChats((prev) => {
                                                      const prevMsgs = prev[platformKey] || [];
                                                      const updated = [...prevMsgs, { role: 'human', content: selected }];
                                                      return { ...prev, [platformKey]: updated };
                                                    });

                                                    sendNestedMessage(selected);
                                                    e.target.disabled = true;
                                                  }}
                                                  defaultValue=""
                                                  className="mt-2 w-full md:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                >
                                                  <option value="" disabled>
                                                    -- Select Your Bank --
                                                  </option>
                                                  <option value="HDFC Bank">🏦 HDFC Bank</option>
                                                  <option value="ICICI Bank">🏦 ICICI Bank</option>
                                                  <option value="SBI">🏦 State Bank of India (SBI)</option>
                                                  <option value="Axis Bank">🏦 Axis Bank</option>
                                                  <option value="No preference">🤝 No preference</option>
                                                </select>
                                              </div>
                                            )}

                                            {msg.role === 'ai' &&
                                              (msg.content.toLowerCase().includes('credit card or debit card') ||
                                                msg.content.toLowerCase().includes('credit card or a debit card')) && (
                                                <div className="mt-3 flex flex-col gap-2">
                                                  {['Credit Card', 'Debit Card'].map((cardType) => (
                                                    <label
                                                      key={cardType}
                                                      className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition"
                                                    >
                                                      <input
                                                        type="radio"
                                                        name={`cardType-${msg.id || Math.random()}`}
                                                        value={cardType}
                                                        onChange={(e) => {
                                                          const selected = e.target.value;
                                                          const platformKey = selectedOption?.platform;
                                                          if (!platformKey) return;

                                                          setChats((prev) => {
                                                            const prevMsgs = prev[platformKey] || [];
                                                            const updated = [...prevMsgs, { role: 'human', content: selected }];
                                                            return { ...prev, [platformKey]: updated };
                                                          });

                                                          sendNestedMessage(selected);

                                                          // Disable both radio buttons after selection
                                                          const allInputs = e.target.closest('div').querySelectorAll('input');
                                                          allInputs.forEach((i) => (i.disabled = true));
                                                        }}
                                                      />
                                                      <span className="text-sm">
                                                        {cardType === 'Credit Card' ? '💳' : '🏦'} {cardType}
                                                      </span>
                                                    </label>
                                                  ))}
                                                </div>
                                              )}

                                            {msg.role === 'ai' && msg.content.includes('Best combo for') && (
                                              <div className="mt-3">
                                                <RenderDynamicComboUI combo={parseComboMessage(msg.content)} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                      {isLoading && (
                                        <div className="flex justify-start">
                                          <div className="bg-white/90 border rounded-2xl p-3 text-gray-500 animate-pulse">🤔 Thinking...</div>
                                        </div>
                                      )}

                                      <div ref={chatEndRef} />
                                    </div>

                                    <div className="flex gap-2 items-center">
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
                                        className="flex-1 border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
                                        disabled={isLoading}
                                        aria-label="Chat message"
                                      />
                                      <button
                                        onClick={sendNestedMessage}
                                        disabled={isLoading || !nestedInput.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold shadow hover:brightness-105 disabled:bg-gray-300"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No booking options available.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
