<!--
  PostClaw — Activation email sequence (rewrite v2 · 2026-04-28)

  Built from:
    · Joanna Wiebe / Copyhackers awareness-spectrum sequencing
    · Val Geisler "dinner party" cadence
    · Lavender + Customer.io subject-line data (sentence case > title case)
    · PostClaw ICP check (non-tech small biz owners — Casa Lasagna, Fabienne, Paul)

  Send schedule (Brevo):
    1. "your sunday nights, back"             ·  Day 0  (3h after signup)
    2. "11 days a year, gone"                  ·  Day 2
    3. "what we wrote for a dog trainer"       ·  Day 4
    4. "what if the posts aren't any good?"    ·  Day 7
    5. "honest question"                       ·  Day 12
    6. "30% off, then i'll go quiet"           ·  Day 21

  Voice rules (CLAUDE.md):
    – No "founder", "autopilot", "AI slop", or product mechanics in body copy.
    – Lead with the outcome (what life looks like AFTER), not the process.
    – Anchor against $2K agency, not against time alone.
    – Single CTA per email. Pricing held until email 2.
    – Sentence-case lowercase subject lines.
-->

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>your sunday nights, back</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }
  .body-text strong { font-weight: 600; }

  .hero-line { font-size: 19px; color: #1E1735; line-height: 1.5; font-weight: 600; margin-bottom: 20px; letter-spacing: -0.3px; }

  .cta-wrap { text-align: center; margin: 32px 0 4px; }
  .cta { display: inline-block; background-color: #ec6f5b; color: #FFFFFF !important; text-decoration: none; padding: 16px 34px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; mso-padding-alt: 16px 34px; }
  .cta:hover { background-color: #d85c48; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .ps-block { margin-top: 22px; }
  .ps-text { font-size: 13px; color: #7B7590; line-height: 1.65; }
  .ps-label { font-weight: 600; color: #ec6f5b; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="hero-line">Imagine this Sunday.</p>

    <p class="body-text">You're not opening Instagram. You're not staring at a blank caption. You're not Googling <em>"what should I post this week."</em></p>

    <p class="body-text">You're with your family. Or doing nothing. And your business posted twice today anyway.</p>

    <p class="body-text">That's the whole point of PostClaw. We write your captions, plan your week, and post when your followers are awake — so you can stop performing on social and run your actual business.</p>

    <p class="body-text">You signed up. You haven't started yet. Two minutes from now, that could change.</p>

    <div class="cta-wrap">
      <a href="https://www.postclaw.io" class="cta">Show me what you'd post this week →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">PostClaw</div>
    </div>

    <div class="ps-block">
      <p class="ps-text"><span class="ps-label">P.S.</span> Nothing's charged today. See what we'd post for you first, then decide.</p>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>

---

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>11 days a year, gone</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }
  .body-text strong { font-weight: 600; }

  .hero-line { font-size: 19px; color: #1E1735; line-height: 1.5; font-weight: 600; margin-bottom: 20px; letter-spacing: -0.3px; }

  .compare-card { background-color: #F8F6F3; border-radius: 12px; padding: 22px 24px; margin: 20px 0 26px; }
  .compare-row { font-size: 15px; color: #1E1735; line-height: 1.55; padding: 8px 0; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .compare-row + .compare-row { border-top: 1px solid #ECE9E5; }
  .compare-label { color: #1E1735; }
  .compare-price { font-weight: 700; font-size: 18px; }
  .compare-price.brand { color: #ec6f5b; }

  .cta-wrap { text-align: center; margin: 28px 0 4px; }
  .cta { display: inline-block; background-color: #ec6f5b; color: #FFFFFF !important; text-decoration: none; padding: 16px 34px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
  .cta:hover { background-color: #d85c48; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="hero-line">Most small business owners give 11 days a year to Instagram.</p>

    <p class="body-text">45 minutes a day picking photos, writing captions, second-guessing what to post.</p>

    <p class="body-text">Five hours a week. Two-hundred-and-seventy hours a year. <strong>Eleven full days you'll never get back.</strong></p>

    <p class="body-text">You don't have to do it yourself. The two real options:</p>

    <div class="compare-card">
      <div class="compare-row">
        <span class="compare-label">Hire a marketing agency</span>
        <span class="compare-price">$2,000+/mo</span>
      </div>
      <div class="compare-row">
        <span class="compare-label">PostClaw — same job</span>
        <span class="compare-price brand">$49/mo</span>
      </div>
    </div>

    <p class="body-text">Same outcome. Forty times less. You still approve every post — but the writing, the planning, the "what should I post Tuesday" — not your problem anymore.</p>

    <div class="cta-wrap">
      <a href="https://www.postclaw.io" class="cta">Get my 11 days back →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">PostClaw</div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>

---

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>what we wrote for a dog trainer</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }
  .body-text strong { font-weight: 600; }
  .body-text em { color: #1E1735; }

  .quote-card { background-color: #F8F6F3; border-left: 3px solid #ec6f5b; border-radius: 0 10px 10px 0; padding: 22px 24px; margin: 22px 0; }
  .quote-text { font-size: 15px; font-style: italic; color: #1E1735; line-height: 1.7; }
  .quote-meta { margin-top: 14px; padding-top: 12px; border-top: 1px solid #ECE9E5; font-size: 12px; color: #7B7590; }

  .cta-wrap { text-align: center; margin: 28px 0 4px; }
  .cta { display: inline-block; background-color: #ec6f5b; color: #FFFFFF !important; text-decoration: none; padding: 16px 34px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
  .cta:hover { background-color: #d85c48; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .ps-block { margin-top: 22px; }
  .ps-text { font-size: 13px; color: #7B7590; line-height: 1.65; }
  .ps-label { font-weight: 600; color: #ec6f5b; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="body-text">The worry I hear most: <em>"won't it sound like a robot wrote it?"</em></p>

    <p class="body-text">Fair. Here's a real one.</p>

    <p class="body-text">Sarah trains dogs in Leeds. She told us her style: <strong>warm expert, no jargon, lots of encouragement.</strong> A few minutes later, here's an Instagram caption we drafted for her:</p>

    <div class="quote-card">
      <p class="quote-text">"Your dog isn't being stubborn. They literally don't understand what you want — yet. A client last week was ready to give up on her rescue. Three sessions in: perfect recall in the park. Three small changes did it. Here they are 👇"</p>
      <div class="quote-meta">Sarah's voice. Two of her clients booked from this one post.</div>
    </div>

    <p class="body-text">Sarah approved it, scheduled it, went back to training dogs.</p>

    <p class="body-text">That's not a robot writing copy. That's <strong>her</strong>, when she's too busy to sit down and write.</p>

    <div class="cta-wrap">
      <a href="https://www.postclaw.io" class="cta">Show me my version →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">PostClaw</div>
    </div>

    <div class="ps-block">
      <p class="ps-text"><span class="ps-label">P.S.</span> The longer you use it, the closer to your voice it gets. Month two reads more like you than you do at 9pm on a Tuesday.</p>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>

---

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>what if the posts aren't any good?</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }

  .qa-block { margin: 22px 0 8px; }
  .qa-q { font-size: 16px; font-weight: 700; color: #1E1735; margin-bottom: 8px; line-height: 1.45; }
  .qa-a { font-size: 15px; color: #1E1735; line-height: 1.65; margin-bottom: 22px; padding-left: 14px; border-left: 2px solid #FCEBE6; }

  .cta-wrap { text-align: center; margin: 28px 0 4px; }
  .cta { display: inline-block; background-color: #ec6f5b; color: #FFFFFF !important; text-decoration: none; padding: 16px 34px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
  .cta:hover { background-color: #d85c48; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="body-text">You signed up but haven't started. Probably one of these in your head:</p>

    <div class="qa-block">
      <p class="qa-q">"What if the posts aren't any good?"</p>
      <p class="qa-a">You see them before they go live. Edit, approve, or trash. Every change teaches us how <em>you</em> talk — by month two, it's nailing your voice.</p>

      <p class="qa-q">"What if I want out?"</p>
      <p class="qa-a">Two clicks. No "talk to sales", no fee, no contract. Your accounts stay yours.</p>

      <p class="qa-q">"$49 — really worth it?"</p>
      <p class="qa-a">An agency that does this for you starts at $2,000 a month. Most owners save four or five hours a week. If it saves you 30 minutes, you've already paid for it.</p>
    </div>

    <div class="cta-wrap">
      <a href="https://www.postclaw.io" class="cta">Try it — cancel anytime →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">PostClaw</div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>

---

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>honest question</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }

  .reply-options { background-color: #F8F6F3; border-radius: 10px; padding: 18px 22px; margin: 18px 0 22px; text-align: center; }
  .reply-chips { display: inline-block; }
  .chip { display: inline-block; background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 20px; padding: 7px 16px; font-size: 13px; color: #1E1735; font-weight: 500; margin: 4px 3px; }

  .subtle-cta-wrap { text-align: center; margin: 22px 0 4px; }
  .subtle-cta { display: inline-block; background-color: transparent; color: #ec6f5b !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; border: 2px solid #ec6f5b; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
  .subtle-cta:hover { background-color: #FCEBE6; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="body-text">I've sent you a few emails. You haven't started. Completely fine — but I'd rather know why than keep showing up.</p>

    <p class="body-text">Hit reply with one word:</p>

    <div class="reply-options">
      <div class="reply-chips">
        <span class="chip">bad timing</span>
        <span class="chip">too pricey</span>
        <span class="chip">skeptical</span>
        <span class="chip">not for me</span>
        <span class="chip">forgot</span>
      </div>
    </div>

    <p class="body-text">If it's "forgot" — say so, I'll nudge you next month and not before. If it's "not for me" — tell me why. One sentence helps me make this better for the next photographer or caterer who signs up.</p>

    <p class="body-text">If you're just busy:</p>

    <div class="subtle-cta-wrap">
      <a href="https://www.postclaw.io" class="subtle-cta">Pick up where I left off →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">replying from my own inbox</div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>

---

<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>30% off, then i'll go quiet</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-font-smoothing: antialiased; }
  body, td, p, a { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .outer-wrap { width: 100%; background-color: #FAF8F5; padding: 32px 16px 40px; }
  .inner { max-width: 520px; margin: 0 auto; }

  .brand { text-align: center; padding-bottom: 28px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: #ec6f5b; text-decoration: none; }
  .brand-dot { color: #ec6f5b; font-size: 22px; line-height: 1; vertical-align: middle; }

  .card { background-color: #FFFFFF; border: 1px solid #ECE9E5; border-radius: 12px; padding: 40px 36px 36px; }
  @media (max-width: 480px) { .card { padding: 32px 24px 28px; } }

  .greeting { font-size: 16px; color: #1E1735; line-height: 1.55; margin-bottom: 22px; }
  .body-text { font-size: 16px; color: #1E1735; line-height: 1.7; margin-bottom: 18px; }

  .offer-card {
    background: linear-gradient(135deg, #ec6f5b 0%, #f08877 100%);
    border-radius: 14px;
    padding: 30px 28px;
    margin: 24px 0;
    text-align: center;
  }
  .offer-eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.8); margin-bottom: 10px; }
  .offer-headline { font-size: 28px; font-weight: 700; color: #FFFFFF; line-height: 1.2; margin-bottom: 6px; letter-spacing: -0.5px; }
  .offer-sub { font-size: 14px; color: rgba(255,255,255,0.92); margin-bottom: 20px; }
  .offer-code-box { display: inline-block; background-color: rgba(255,255,255,0.18); border: 1px dashed rgba(255,255,255,0.55); border-radius: 8px; padding: 8px 24px; }
  .offer-code { font-size: 17px; font-weight: 700; color: #FFFFFF; letter-spacing: 2.5px; }

  .cta-wrap { text-align: center; margin: 28px 0 4px; }
  .cta { display: inline-block; background-color: #ec6f5b; color: #FFFFFF !important; text-decoration: none; padding: 16px 34px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
  .cta:hover { background-color: #d85c48; }

  .sig-block { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ECE9E5; }
  .sig-name { font-size: 14px; color: #1E1735; font-weight: 600; }
  .sig-role { font-size: 13px; color: #7B7590; margin-top: 2px; }

  .ps-block { margin-top: 22px; }
  .ps-text { font-size: 13px; color: #7B7590; line-height: 1.65; }
  .ps-label { font-weight: 600; color: #ec6f5b; }

  .footer { text-align: center; padding: 28px 0 0; }
  .footer-text { font-size: 12px; color: #ADA8B8; line-height: 1.5; }
  .footer-text a { color: #ADA8B8; text-decoration: underline; }
  .footer-divider { width: 40px; height: 2px; background-color: #ECE9E5; margin: 0 auto 16px; border-radius: 2px; }
</style>
</head>
<body>
<div class="outer-wrap"><div class="inner">

  <div class="brand">
    <a href="https://www.postclaw.io" class="brand-name"><span class="brand-dot">·</span> PostClaw</a>
  </div>

  <div class="card">

    <p class="greeting">Hey {{ contact.FIRSTNAME | default: "there" }},</p>

    <p class="body-text">Last email. Promise.</p>

    <p class="body-text">You signed up a few weeks back and never started. Before I go quiet, one final thing on the table:</p>

    <div class="offer-card">
      <div class="offer-eyebrow">7-day window · just for you</div>
      <div class="offer-headline">30% off your first 3 months</div>
      <div class="offer-sub">PostClaw at $34/month — less than one client lunch.</div>
      <div class="offer-code-box">
        <span class="offer-code">READY30</span>
      </div>
    </div>

    <p class="body-text">Three months is enough to see your voice come through, run a full month of posts on Instagram and Facebook without thinking about it, and decide if it's worth keeping.</p>

    <p class="body-text">Or skip it. Your dashboard isn't going anywhere.</p>

    <div class="cta-wrap">
      <a href="https://www.postclaw.io?code=READY30" class="cta">Activate with 30% off →</a>
    </div>

    <div class="sig-block">
      <div class="sig-name">Adrien</div>
      <div class="sig-role">PostClaw</div>
    </div>

    <div class="ps-block">
      <p class="ps-text"><span class="ps-label">P.S.</span> When the code expires, no more activation emails from me. If you change your mind a year from now, just log in — your account's still there.</p>
    </div>

  </div>

  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-text">PostClaw · Plans your posts. Writes your captions. Posts them for you.<br><a href="{{ unsubscribe }}">Unsubscribe</a></p>
  </div>

</div></div>
</body>
</html>
