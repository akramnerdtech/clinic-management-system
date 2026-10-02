import { BedDouble, Building2, CheckCircle2, UserRound } from 'lucide-react';
import { WARD_STYLES } from '@/data/rooms';
import type { WardRate } from '@/types/rooms';

interface RoomStatsProps {
  totalRooms: number;
  totalBeds: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  slotsPerRoom: string;
  rates: WardRate[];
}

const formatRate = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

const PILL_TONES = {
  amber: 'border-[#f6dfa0] bg-[#fff7e0] text-[#b7791f]',
  green: 'border-[#bfeed6] bg-[#e7f8ef] text-[#16a064]',
  red: 'border-[#ffd0d3] bg-[#fff0f1] text-[#e4393d]',
};

export function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: React.ReactNode }) {
  return (
    <em className={`inline-block whitespace-nowrap rounded-full border px-[7px] py-1 text-[9px] font-bold not-italic leading-none tracking-normal ${PILL_TONES[tone]}`}>
      {children}
    </em>
  );
}

const grid = 'grid grid-cols-2 gap-2 sm:gap-2.5 min-[1101px]:grid-cols-4';
const card = 'flex items-center justify-between gap-2.5 rounded-lg border border-[#edf0f5] bg-white px-3 py-[11px] shadow-sm sm:px-4 sm:py-3.5';
const body = 'flex min-w-0 flex-col gap-0.5';
const label = 'text-[9px] font-bold tracking-[0.06em] text-[#616c78]';
const value = 'mb-px mt-[3px] flex flex-wrap items-center gap-1.5 text-lg font-bold leading-tight tracking-tight text-[#182236] sm:text-[22px]';
const note = 'text-[10px] text-[#6d7685]';
const tile = 'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9';

/** Occupancy summary cards plus the per-day ward tariff cards. */
export function RoomStats({ totalRooms, totalBeds, occupied, available, occupancyRate, slotsPerRoom, rates }: RoomStatsProps) {
  return (
    <>
      <div className={`${grid} mb-2 sm:mb-2.5`}>
        <div className={card}>
          <div className={body}>
            <span className={label}>TOTAL ROOMS</span>
            <strong className={value}>{totalRooms}</strong>
            <small className={note}>{totalRooms} Rooms · {totalBeds} Total Beds</small>
          </div>
          <i className={`${tile} bg-[#f1f3f9] text-[#5b6578]`}><Building2 size={16} /></i>
        </div>
        <div className={card}>
          <div className={body}>
            <span className={label}>TOTAL CAPACITY</span>
            <strong className={value}>{totalBeds} Beds</strong>
            <small className={note}>{slotsPerRoom}</small>
          </div>
          <i className={`${tile} bg-[#eaf2ff] text-[#2b6fd6]`}><BedDouble size={16} /></i>
        </div>
        <div className={card}>
          <div className={body}>
            <span className={label}>OCCUPIED BEDS</span>
            <strong className={value}>{occupied} <Pill tone="amber">{formatRate(occupancyRate)} Rate</Pill></strong>
            <small className={note}>Active in-patients</small>
          </div>
          <i className={`${tile} bg-[#e6f6f3] text-[#007d72]`}><UserRound size={16} /></i>
        </div>
        <div className={card}>
          <div className={body}>
            <span className={label}>AVAILABLE BEDS</span>
            <strong className={`${value} !text-[#007d72]`}>{available} <Pill tone="green">{available ? 'Ready' : 'Full'}</Pill></strong>
            <small className={note}>Immediate admission</small>
          </div>
          <i className={`${tile} bg-[#e7f8ef] text-[#16a064]`}><CheckCircle2 size={16} /></i>
        </div>
      </div>

      <div className={`${grid} mb-3.5`}>
        {rates.map((rate) => (
          <div className={`${card} flex-row-reverse`} key={rate.ward}>
            <div className={`${body} flex-1`}>
              <span className={`${label} ${WARD_STYLES[rate.ward].label}`}>{rate.label}</span>
              <small className={`${note} mt-0.5`}>Per Day</small>
              <strong className={`${value} !mt-1 sm:!text-xl`}>₹{rate.perDay.toLocaleString('en-IN')}</strong>
            </div>
            <i className={`${tile} text-[10px] font-extrabold not-italic tracking-[0.02em] ${WARD_STYLES[rate.ward].tile}`}>{rate.short}</i>
          </div>
        ))}
      </div>
    </>
  );
}