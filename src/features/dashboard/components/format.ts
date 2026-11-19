import type { Color } from 'react-typescript-ui';
import type { Appointment } from '../../../types';

/** "₹1,24,500" — en-IN grouping, no paise (style guide section 14). */
export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "09:30" (24h, as stored) -> "9:30 AM". Leaves unparseable input as-is. */
export function formatTime12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const h = Number(match[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${match[2]} ${suffix}`;
}

/** "17 Nov 2026". */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whole days from today to `value` (negative = in the past). */
export function daysFromToday(value: string): number {
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Status badge colors from style guide section 9.4. */
export function appointmentStatusColor(status: Appointment['status']): Color {
  switch (status) {
    case 'Scheduled':
      return 'primary';
    case 'Completed':
      return 'success';
    case 'Cancelled':
    case 'No Show':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Indian mobile numbers are stored as 10 digits; WhatsApp links need the country code. */
export function whatsappLink(number: string): string {
  const digits = number.replace(/\D/g, '');
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}
