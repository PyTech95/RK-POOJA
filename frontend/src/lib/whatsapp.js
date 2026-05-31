// Build a wa.me WhatsApp deep-link with a pre-filled inquiry message.
export function buildInquiryWhatsApp({ inquiry, number }) {
  const lines = [
    "Hello RK POOJA Team,",
    "",
    `I would like to inquire about: ${inquiry.service_type?.toUpperCase()} ${inquiry.vehicle_category ? "(" + inquiry.vehicle_category + ")" : ""}`,
  ];
  if (inquiry.sub_service) lines.push(`Service: ${inquiry.sub_service}`);
  if (inquiry.pickup) lines.push(`Pickup: ${inquiry.pickup}`);
  if (inquiry.destination) lines.push(`Drop: ${inquiry.destination}`);
  if (inquiry.journey_date) lines.push(`Date: ${inquiry.journey_date}`);
  if (inquiry.return_date) lines.push(`Return: ${inquiry.return_date}`);
  if (inquiry.journey_time) lines.push(`Time: ${inquiry.journey_time}`);
  if (inquiry.passengers) lines.push(`Passengers: ${inquiry.passengers}`);
  if (inquiry.weight_kg) lines.push(`Weight: ${inquiry.weight_kg} kg`);
  if (inquiry.goods_type) lines.push(`Goods: ${inquiry.goods_type}`);
  if (inquiry.urgency) lines.push(`Urgency: ${inquiry.urgency}`);
  if (inquiry.purpose) lines.push(`Purpose: ${inquiry.purpose}`);
  if (inquiry.special_requirements) lines.push(`Notes: ${inquiry.special_requirements}`);
  if (inquiry.quote_min && inquiry.quote_max) {
    lines.push("", `AI estimated quote: ₹${inquiry.quote_min} – ₹${inquiry.quote_max}`);
  }
  if (inquiry.customer_name) lines.push("", `Name: ${inquiry.customer_name}`);
  if (inquiry.customer_phone) lines.push(`Phone: ${inquiry.customer_phone}`);
  lines.push("", "Please contact me. — sent via RK POOJA app");
  const msg = encodeURIComponent(lines.join("\n"));
  const cleanNumber = String(number || "919999999999").replace(/\D/g, "");
  return `https://wa.me/${cleanNumber}?text=${msg}`;
}
