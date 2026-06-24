const STATUS_LABELS = {
  WAITING_PAYMENT: "⏳ در انتظار پرداخت",
  WAITING_APPROVAL: "🔍 در انتظار تایید ادمین",
  APPROVED: "✅ تایید شده",
  PACKAGING: "📦 در حال بسته‌بندی",
  SHIPPED: "🚚 ارسال شده",
  DELIVERED: "🎉 تحویل داده شده",
  REJECTED: "❌ رد شده",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function generateTrackingCode() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PL-${date}-${rand}`;
}

module.exports = {
  statusLabel,
  generateTrackingCode,
  STATUS_LABELS,
};
