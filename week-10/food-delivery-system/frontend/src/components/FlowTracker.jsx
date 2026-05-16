// Real-time Flow Tracker Component
// Hiển thị luồng xử lý hậu trường của 1 đơn hàng theo thời gian thực

const STEPS = [
  { key: "order",      label: "① Order",            sub: "REST :8082",     tag: "REST"   },
  { key: "mq_created", label: "② ORDER_CREATED",    sub: "RabbitMQ",       tag: "EVENT"  },
  { key: "payment",    label: "③ Payment",           sub: ":8083 async",    tag: "EVENT"  },
  { key: "mq_paid",    label: "④ PAYMENT_SUCCESS",   sub: "RabbitMQ",       tag: "EVENT"  },
  { key: "notify",     label: "⑤ Notify",            sub: "SSE :8084",      tag: "EVENT"  },
];

// stepIndex: 0=idle, 1=order done, 2=ORDER_CREATED, 3=processing, 4=mq_paid, 5=notify done
export function FlowStep({ stepIndex = 0, failed = false }) {
  return (
    <div className="flow-tracker">
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        let cls = "fstep";
        if (failed && stepNum >= 4) cls += " fstep-failed";
        else if (stepNum < stepIndex) cls += " fstep-done";
        else if (stepNum === stepIndex) cls += " fstep-active";

        return (
          <div key={s.key} className={cls}>
            {stepNum === stepIndex && <span className="fstep-pulse" />}
            <div className="fstep-label">{s.label}</div>
            <div className="fstep-sub">{s.sub}</div>
            <div className={`fstep-tag ftag-${s.tag.toLowerCase()}`}>{s.tag}</div>
          </div>
        );
      })}
    </div>
  );
}

// Danh sách theo dõi nhiều đơn hàng cùng lúc
export function ActiveOrdersFlow({ orderFlows }) {
  const entries = Object.entries(orderFlows);
  if (entries.length === 0) return null;

  return (
    <div className="active-flows">
      <div className="af-title">📡 Luồng xử lý hậu trường (real-time)</div>
      {entries.map(([orderId, flow]) => (
        <div key={orderId} className="af-item">
          <div className="af-header">
            <span className="af-order-id">#{orderId}</span>
            <span className={`af-status ${flow.failed ? "af-failed" : flow.step >= 5 ? "af-done" : "af-processing"}`}>
              {flow.failed ? "❌ Thất bại" : flow.step >= 5 ? "✅ Hoàn tất" : "⏳ Đang xử lý..."}
            </span>
            <span className="af-time">{flow.lastUpdate}</span>
          </div>
          <FlowStep stepIndex={flow.step} failed={flow.failed} />
          {flow.message && (
            <div className="af-msg">{flow.message}</div>
          )}
        </div>
      ))}
    </div>
  );
}
