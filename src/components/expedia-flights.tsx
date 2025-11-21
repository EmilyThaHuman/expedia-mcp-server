import React, { useEffect, useRef, useState } from 'react';
import { useWidgetProps } from '../hooks';
import '../styles/index.css';
import { cn } from '../lib/utils';

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  cabinClass: string;
  imageUrl?: string;
}

interface ExpediaFlightsProps {
  flights?: Flight[];
  origin?: string;
  destination?: string;
  departureDate?: string;
  isRoundTrip?: boolean;
  returnDate?: string;
  totalResults?: number;
}

const ExpediaFlights: React.FC = () => {
  const props = useWidgetProps<ExpediaFlightsProps>({
    flights: [],
    origin: 'SEA',
    destination: 'SJD',
    departureDate: 'Nov 22',
    isRoundTrip: false,
    returnDate: '',
    totalResults: 0,
  });

  const {
    flights = [],
    origin = 'SEA',
    destination = 'SJD',
    departureDate = 'Nov 22',
    isRoundTrip = false,
    totalResults = 0,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(true);

  const updateButtons = () => {
    if (!containerRef.current) return;
    
    const scrollLeft = containerRef.current.scrollLeft;
    const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
    
    setShowPrevBtn(scrollLeft > 0);
    setShowNextBtn(scrollLeft < maxScroll - 1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateButtons();
    container.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);

    return () => {
      container.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [flights]);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const scrollAmount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const formatStops = (stops: number) => {
    if (stops === 0) return 'Nonstop';
    return `${stops} stop${stops > 1 ? 's' : ''}`;
  };

  const isNextDay = (departureTime: string, arrivalTime: string) => {
    const depHour = parseInt(departureTime.split(':')[0]);
    const arrHour = parseInt(arrivalTime.split(':')[0]);
    return arrHour < depHour || (departureTime.includes('PM') && arrivalTime.includes('AM'));
  };

  const handleFlightSelect = (flight: Flight) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'flight-selected',
        data: {
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          airline: flight.airline,
          price: flight.price,
          origin,
          destination,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          duration: flight.duration,
          stops: flight.stops,
        },
      }, '*');
    }
  };

  if (flights.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-10 text-gray-500">
        No flights found
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="relative w-full p-4">
        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth p-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {flights.map((flight, index) => {
            const tripType = isRoundTrip ? 'Round trip' : 'One way';
            const stopsText = formatStops(flight.stops);
            const nextDay = isNextDay(flight.departureTime, flight.arrivalTime);
            const airlineLogoUrl = flight.imageUrl || 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/multiple_airlines_logo_sq.svg';

            return (
              <div
                key={flight.id}
                className={cn(
                  "flex-shrink-0 w-[320px] transition-all duration-300",
                  "opacity-100 translate-y-0"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  onClick={() => handleFlightSelect(flight)}
                  className={cn(
                    "bg-transparent border border-gray-200 rounded-3xl overflow-hidden",
                    "transition-all duration-300 cursor-pointer h-[320px] flex flex-col"
                  )}
                >
                  {/* Header Section */}
                  <div className="p-3">
                    <div className="grid grid-cols-[1fr_auto] gap-4 mb-2">
                      <div className="flex flex-col justify-end">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">{tripType}</h2>
                        <div className="text-sm text-gray-600">{departureDate}</div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <h2 className="text-3xl font-bold text-gray-900">${flight.price}</h2>
                        <div className="text-sm text-gray-600">USD per adult</div>
                      </div>
                    </div>
                  </div>

                  {/* Flight Details Section */}
                  <div className="px-3 pb-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          className="w-8 h-8 object-contain flex-shrink-0"
                          alt={flight.airline}
                          src={airlineLogoUrl}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/multiple_airlines_logo_sq.svg';
                          }}
                        />
                        <div className="flex-1 min-w-[220px]">
                          <div className="w-full flex items-center gap-2">
                            <div className="text-base font-semibold whitespace-nowrap text-gray-900">
                              {flight.departureTime}
                            </div>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="h-0.5 bg-gray-300 flex-1" />
                              <svg className="w-2.5 h-2.5 fill-gray-300 flex-shrink-0" viewBox="0 0 10 10">
                                <circle cx="5" cy="5" r="5" />
                              </svg>
                              <div className="h-0.5 bg-gray-300 flex-1" />
                            </div>
                            <div className="flex">
                              <div className="text-base font-semibold whitespace-nowrap text-gray-900">
                                {flight.arrivalTime}
                              </div>
                              {nextDay && (
                                <div className="ml-1">
                                  <sup className="text-[10px] text-red-700 font-bold">+1</sup>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {origin} - {destination}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <div className="text-sm font-medium text-gray-900">{flight.duration}</div>
                          <div className="text-sm font-medium text-gray-900">• {stopsText}</div>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{flight.cabinClass}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="px-3 pb-3 mt-auto">
                    <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                      <button
                        className={cn(
                          "w-full bg-gray-900 text-white border-none rounded-3xl py-2.5 px-4",
                          "text-sm font-semibold cursor-pointer transition-colors duration-200",
                          "hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        )}
                        style={{ zIndex: 200 }}
                      >
                        Book on Expedia
                      </button>
                      <div className="text-center text-blue-600 text-sm font-semibold cursor-pointer py-1 hover:text-blue-700 hover:underline transition-colors">
                        See fare details
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Controls */}
        <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none z-10">
          <button
            onClick={() => scroll('left')}
            disabled={!showPrevBtn}
            className={cn(
              "pointer-events-auto w-10 h-10 rounded-3xl bg-white border border-gray-300",
              "shadow-md cursor-pointer flex items-center justify-center transition-all duration-200 mx-2",
              "hover:bg-gray-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed",
              !showPrevBtn && "opacity-0 pointer-events-none"
            )}
            aria-label="Show previous card"
          >
            <svg className="w-6 h-6 stroke-gray-900" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showNextBtn}
            className={cn(
              "pointer-events-auto w-10 h-10 rounded-3xl bg-white border border-gray-300",
              "shadow-md cursor-pointer flex items-center justify-center transition-all duration-200 mx-2",
              "hover:bg-gray-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed",
              !showNextBtn && "opacity-0 pointer-events-none"
            )}
            aria-label="Show next card"
          >
            <svg className="w-6 h-6 stroke-gray-900" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpediaFlights;








