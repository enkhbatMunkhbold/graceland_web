import { translations } from '../context/LanguageContext';

export function formatFullDate(date, language) {
  if (language !== 'mn') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const weekday = translations.mn.weekdaysFull[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday}, ${year} оны ${month}-р сарын ${day}`;
}

export function formatMonthYear(date, language) {
  if (language !== 'mn') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year} оны ${month}-р сар`;
}
