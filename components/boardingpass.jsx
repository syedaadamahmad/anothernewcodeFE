import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// BoardingPassCard with filter editing capability
export default function BoardingPassCard(props) {
  const {
    show,
    onClose,
    setBpSearching,
    selectedDate,
    setSelectedDate,
    selectedAirlines,
    setSelectedAirlines,
    minBudget,
    setMinBudget,
    maxBudget,
    setMaxBudget,
    travelClass,
    setTravelClass,
    pendingSearchPayload,
    setCurrentFlightData,
    sendMessageAutomatically,
    messages,
    setMessages,
    availableAirlines,
  } = props;

  const airlines = useMemo(() => (
    Array.isArray(availableAirlines) && availableAirlines.length
      ? availableAirlines
      : ['No Preference', 'Air India', 'Vistara', 'IndiGo', 'SpiceJet', 'Akasa Air', 'Go First']
  ), [availableAirlines]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [tmpDate, setTmpDate] = useState(selectedDate || '');
  const [tmpAirlines, setTmpAirlines] = useState(selectedAirlines?.slice() || []);
  const [tmpMax, setTmpMax] = useState(Number(maxBudget || 50000));
  const [tmpClass, setTmpClass] = useState(travelClass || 'Economy');

  // Extract dynamic route info from messages
  const [routeInfo, setRouteInfo] = useState({ from: 'DEL', to: 'MAA', fromCity: 'New Delhi', toCity: 'Chennai' });

  useEffect(() => {
    // Extract route from chat history
    if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'human') {
          const content = msg.content.toLowerCase();
          
          // Pattern: "from X to Y" or "X to Y"
          const routePattern = /(?:from\s+)?([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$|,|\.)/i;
          const match = content.match(routePattern);
          
          if (match) {
            const fromText = match[1].trim();
            const toText = match[2].trim();
            
            // Map city names to codes
            const cityMap = {
              'delhi': { code: 'DEL', name: 'New Delhi' },
              'new delhi': { code: 'DEL', name: 'New Delhi' },
              'mumbai': { code: 'BOM', name: 'Mumbai' },
              'bangalore': { code: 'BLR', name: 'Bangalore' },
              'bengaluru': { code: 'BLR', name: 'Bangalore' },
              'chennai': { code: 'MAA', name: 'Chennai' },
              'kolkata': { code: 'CCU', name: 'Kolkata' },
              'hyderabad': { code: 'HYD', name: 'Hyderabad' },
              'pune': { code: 'PNQ', name: 'Pune' },
              'ahmedabad': { code: 'AMD', name: 'Ahmedabad' },
              'goa': { code: 'GOI', name: 'Goa' },
              'jaipur': { code: 'JAI', name: 'Jaipur' },
            };
            
            const fromCity = cityMap[fromText] || { code: fromText.toUpperCase().slice(0, 3), name: fromText };
            const toCity = cityMap[toText] || { code: toText.toUpperCase().slice(0, 3), name: toText };
            
            setRouteInfo({
              from: fromCity.code,
              to: toCity.code,
              fromCity: fromCity.name,
              toCity: toCity.name
            });
            break;
          }
        }
      }
    }
  }, [messages]);

  React.useEffect(() => {
    if (show) {
      setTmpDate(selectedDate || '');
      setTmpAirlines(selectedAirlines?.slice() || []);
      setTmpMax(Number(maxBudget || 50000));
      setTmpClass(travelClass || 'Economy');
    }
  }, [show, selectedDate, selectedAirlines, maxBudget, travelClass]);

  async function applyEditsAndSearch() {
    // Commit to global state
    setSelectedDate(tmpDate || '');
    setSelectedAirlines(tmpAirlines.length ? tmpAirlines : ['No Preference']);
    setMaxBudget(tmpMax);
    setTravelClass(tmpClass);

    onClose?.();
    setBpSearching(true);

    // Build search message - format exactly like filter responses
    const parts = [];
    if (tmpDate) parts.push(`My travel date is ${tmpDate}`);
    
    if (tmpAirlines.length) {
      if (tmpAirlines.includes('No Preference')) {
        parts.push('No preference');
      } else {
        parts.push(`I prefer ${tmpAirlines.join(', ')}`);
      }
    }
    
    parts.push(`My budget is ₹${tmpMax}`);
    parts.push(`I prefer ${tmpClass} class`);

    const searchMessage = parts.join('. ');

    const userMessage = { role: 'human', content: searchMessage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Send to backend
    await sendMessageAutomatically(newMessages);
  }

  function confirmPendingSearch() {
    if (pendingSearchPayload && Array.isArray(pendingSearchPayload)) {
      setBpSearching(true);
      setCurrentFlightData(pendingSearchPayload);
    }
    onClose?.();
  }

  function toggleAirlineChip(airline) {
    if (airline === 'No Preference') {
      setTmpAirlines(['No Preference']);
      return;
    }
    const withoutNoPref = tmpAirlines.filter(a => a !== 'No Preference');
    if (withoutNoPref.includes(airline)) {
      setTmpAirlines(withoutNoPref.filter(a => a !== airline));
    } else {
      setTmpAirlines([...withoutNoPref, airline]);
    }
  }

  if (!show) return null;

  // Format date display
  function formatDateForDisplay(d) {
    if (!d) return 'Not selected';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) { return d; }
  }

  // Simple barcode generator (visual only)
  function BarcodeSVG({ value = '||:||:|::||::|:|:|' }) {
    const bars = value.split('').map((ch, i) => ({
      w: (ch.charCodeAt ? ch.charCodeAt(0) : 1) % 6 + 1,
      h: 36 + ((i * 7) % 40),
    }));

    let x = 0;
    return (
      <svg width="180" height="50" viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="100%" height="100%" fill="transparent" />
        {bars.map((b, i) => {
          const rect = (
            <rect key={i} x={x} y={50 - b.h} width={b.w} height={b.h} fill="currentColor" />
          );
          x += b.w + 1;
          return rect;
        })}
      </svg>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="max-w-3xl mx-auto px-2"
    >
      <div className="relative rounded-2xl shadow-2xl overflow-visible">
        <div className="flex flex-col md:flex-row bg-gradient-to-br from-white to-slate-50 rounded-2xl overflow-hidden border border-slate-200">

          {/* Left - main ticket info */}
          <div className="w-full md:w-2/3 p-6 md:p-8 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-800 text-white font-bold shadow-md">✈️</div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-medium">boarding pass</div>
                    <div className="text-lg font-extrabold tracking-tight text-slate-800">
                      {selectedAirlines?.length ? selectedAirlines.join(', ') : 'No Preference'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">From</div>
                    <div className="text-sm font-semibold text-slate-800">{routeInfo.from}</div>
                    <div className="text-xs text-slate-500">{routeInfo.fromCity}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase">To</div>
                    <div className="text-sm font-semibold text-slate-800">{routeInfo.to}</div>
                    <div className="text-xs text-slate-500">{routeInfo.toCity}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Date</div>
                    <div className="text-sm font-bold text-slate-800">{formatDateForDisplay(selectedDate)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase">Class</div>
                    <div className="text-sm font-bold text-slate-800">{travelClass}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase">Budget</div>
                    <div className="text-sm font-bold text-slate-800">
                      Up to ₹{Number(maxBudget).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      if (pendingSearchPayload && Array.isArray(pendingSearchPayload)) confirmPendingSearch();
                      else applyEditsAndSearch();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition"
                  >
                    {pendingSearchPayload ? 'Confirm & Show Flights' : 'Confirm & Search Flights'}
                  </button>

                  <button
                    onClick={() => setIsEditorOpen(v => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-slate-800 font-semibold hover:shadow transition"
                  >
                    {isEditorOpen ? 'Close Editor' : 'Quick Edit'}
                  </button>

                  <button
                    onClick={() => onClose?.()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>

              </div>

              {/* Price badge */}
              <div className="flex flex-col items-end gap-3">
                <div className="px-3 py-2 rounded-lg bg-gradient-to-tr from-amber-50 to-amber-100 border border-amber-200 text-amber-800 font-semibold text-sm">
                  Best Match
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase">Max Budget</div>
                  <div className="text-xl font-extrabold text-slate-900">
                    ₹{Number(maxBudget || 50000).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative route line */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-10 bg-slate-50 rounded-md flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold">{routeInfo.from}</div>
                  <div className="text-xs text-slate-400">→</div>
                  <div className="text-sm font-bold">{routeInfo.to}</div>
                </div>
                <div className="text-xs text-slate-400">Non-stop • 2h 30m</div>
              </div>
            </div>

            {/* Info note */}
            <div className="mt-4 text-xs text-slate-500">
              Tip: Tap <span className="font-semibold text-slate-700">Quick Edit</span> to refine date, airlines or budget before confirming.
            </div>

            {/* Editor (expanded) */}
            <AnimatePresence>
              {isEditorOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 p-4 rounded-xl border bg-white/60 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date picker */}
                      <div>
                        <label className="text-xs font-medium text-slate-600">📅 Travel Date</label>
                        <input 
                          type="date" 
                          min={new Date().toISOString().split('T')[0]} 
                          value={tmpDate} 
                          onChange={(e) => setTmpDate(e.target.value)} 
                          className="mt-2 w-full px-3 py-2 rounded-lg border bg-white text-sm" 
                        />
                      </div>

                      {/* Class picker */}
                      <div>
                        <label className="text-xs font-medium text-slate-600">💺 Cabin Class</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['Economy','Premium Economy','Business','First'].map(cls => (
                            <button 
                              key={cls} 
                              onClick={() => setTmpClass(cls)} 
                              className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
                                tmpClass===cls
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Airline picker */}
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">✈️ Preferred Airline</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {airlines.map(a => (
                            <button 
                              key={a} 
                              onClick={() => toggleAirlineChip(a)} 
                              className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
                                tmpAirlines.includes(a)
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Budget slider - ONLY MAX */}
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">💰 Maximum Budget</label>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Budget Limit</span>
                            <span className="font-bold">₹{tmpMax.toLocaleString()}</span>
                          </div>
                          <input 
                            type="range" 
                            min="5000" 
                            max="50000" 
                            step="1000"
                            value={tmpMax} 
                            onChange={(e) => setTmpMax(Number(e.target.value))} 
                            className="w-full accent-indigo-600" 
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>₹5,000</span>
                            <span>₹50,000</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-4 flex gap-3">
                          <button 
                            onClick={applyEditsAndSearch} 
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                          >
                            Update & Search
                          </button>
                          <button 
                            onClick={() => { 
                              setTmpDate(selectedDate||''); 
                              setTmpAirlines(selectedAirlines?.slice()||[]); 
                              setTmpMax(Number(maxBudget||50000)); 
                              setTmpClass(travelClass||'Economy'); 
                              setIsEditorOpen(false); 
                            }} 
                            className="flex-1 py-3 rounded-xl border hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Right - detachable stub */}
          <div className="w-full md:w-1/3 relative bg-slate-50 p-6 md:p-8 flex flex-col justify-between border-l border-slate-200">
            {/* Perforation circles */}
            <div className="absolute left-[-14px] top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 hidden md:block"></div>
            <div className="absolute right-[-14px] top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 hidden md:block"></div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Boarding</div>
                  <div className="text-sm font-bold text-slate-900">Gate A12</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase">Seat</div>
                  <div className="text-sm font-bold text-slate-900">12A</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-500 uppercase">Passenger</div>
                <div className="text-sm font-semibold text-slate-800">Akshat S.</div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-500 uppercase">Ref</div>
                <div className="text-sm font-mono text-slate-700">TKY-92384</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="bg-white px-2 py-2 rounded-md inline-block shadow-inner text-slate-700">
                <BarcodeSVG value={`${selectedDate || ''}-${(selectedAirlines||[]).join('|')}`} />
              </div>
              <div className="mt-3 text-xs text-slate-500">Scan at gate</div>
            </div>

            <div className="mt-5 text-xs text-slate-400">
              This stub is decorative — tap Confirm to fetch real flight results.
            </div>
          </div>
        </div>

        {/* Perforation dotted line */}
        <div className="absolute inset-x-2 top-1/2 transform -translate-y-1/2 pointer-events-none hidden md:block">
          <div className="h-px border-t border-dashed border-slate-200 opacity-80"></div>
        </div>
      </div>
    </motion.div>
  );
}