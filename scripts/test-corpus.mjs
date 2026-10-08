// Consistency check across message types. Requires the dev server running.
// Usage: node scripts/test-corpus.mjs
const CASES = [
  {
    name: "1. Blatant bank phishing",
    expect: ["scam"],
    text: "URGENT: Your account has been locked. Verify at http://secure-bank-verify.xyz within 24 hours or funds will be held. Send the OTP to complete verification.",
  },
  {
    name: "2. Legit appointment reminder",
    expect: ["likely_safe"],
    text: "Hi, this is Dr. Patel's office reminding you of your appointment on Tuesday at 3:30 PM. Reply C to confirm or call 555-0134 to reschedule. No action needed if you've already confirmed.",
  },
  {
    name: "3. Gift card boss scam",
    expect: ["scam", "suspicious"],
    text: "Hi, this is your CEO. I'm in a board meeting and can't talk. I need you to buy 5 Apple gift cards for client thank-yous today. Keep this between us for now, it's a surprise. Send me the codes ASAP.",
  },
  {
    name: "4. Crypto investment bait",
    expect: ["scam", "suspicious"],
    text: "Congratulations! You've been selected for our exclusive crypto program. Guaranteed 15% monthly returns, fully automated trading. Deposit as little as $250 USDT to start earning today. Limited spots, act now!",
  },
  {
    name: "5. Marketplace overpayment",
    expect: ["scam", "suspicious"],
    text: "Hi! I'm interested in your couch. My movers will pick it up. I'll pay you extra $200 for holding it. I'll send you a Zelle payment now — please refund the difference to my shipper via gift card since my bank app isn't working. Send your email for the Zelle.",
  },
  {
    name: "6. Multilingual (Spanish) phishing",
    expect: ["scam", "suspicious"],
    text: "Estimado cliente: Su cuenta del banco ha sido bloqueada por seguridad. Verifique su identidad inmediatamente en http://banco-seguro-verificar.xyz o su cuenta será cancelada en 24 horas.",
  },
  {
    name: "7. Legit delivery with tracking on official site",
    expect: ["likely_safe", "suspicious"],
    text: "Your Amazon order #113-7743 will arrive tomorrow between 2-5 PM. Track it in the Amazon app under Your Orders. If you won't be home, you can leave it with a neighbor via the app.",
  },
  {
    name: "8. Job offer with upfront fee",
    expect: ["scam", "suspicious"],
    text: "Dear candidate, we are pleased to offer you a remote data-entry position at $45/hour, no experience needed. To secure your slot, a one-time equipment registration fee of $99 is required via wire transfer. Start immediately!",
  },
  {
    name: "9. Tech support call transcript",
    expect: ["scam", "suspicious"],
    text: "Agent: Hello, I'm calling from Microsoft Windows Support. Our servers detected a virus on your computer right now. Please download AnyDesk so my technician can remove it before your data is compromised. Don't worry, this service is free today.",
  },
  {
    name: "10. Genuine personal message",
    expect: ["likely_safe"],
    text: "Hey! It's Sarah from the study group. Are we still on for the library at 6? Also I brought your notes, thanks so much for lending them. See you there!",
  },
];

const URL = process.env.TEST_URL || "http://localhost:3000/api/analyze";

async function run() {
  let passed = 0;
  for (const c of CASES) {
    const t0 = Date.now();
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: c.text }),
      });
      const data = await res.json();
      const verdict = data?.analysis?.verdict ?? "ERROR";
      const score = data?.analysis?.risk_score ?? "-";
      const tactics = (data?.analysis?.tactics ?? []).map((t) => t.tactic).join(",");
      const ok = c.expect.includes(verdict);
      if (ok) passed += 1;
      console.log(
        `${ok ? "PASS" : "FAIL"} | ${c.name} | verdict=${verdict} score=${score} (${Date.now() - t0}ms)\n       expect=[${c.expect.join("|")}] tactics=[${tactics}]`,
      );
    } catch (err) {
      console.log(`FAIL | ${c.name} | request error: ${err.message}`);
    }
  }
  console.log(`\n${passed}/${CASES.length} within expected verdicts`);
}

run();
