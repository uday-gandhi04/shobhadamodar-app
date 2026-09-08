export const getBusinessDate = () => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );

  return formatter.format(now);
};
