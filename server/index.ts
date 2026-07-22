import 'dotenv/config'
import express from 'express'
import nodemailer from 'nodemailer'
import { moneymapRouter } from './moneymap'

const app = express()
app.use(express.json())

// MoneyMap — สถานะพอร์ตลงทุน + ประวัติมูลค่าพอร์ตย้อนหลัง (/api/moneymap/*, /api/portfolio/*)
app.use(moneymapRouter)

// SMTP transport — set the SMTP_* env vars in .env. When unset, falls back
// to Ethereal's JSON transport so the dev server still responds with a
// preview URL instead of erroring.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true })

interface NotifyReq {
  documentCode?: string
  message: string
  recipients: Array<{ name: string; email: string }>
}

app.post('/api/notify', async (req, res) => {
  const { documentCode, message, recipients } = req.body as NotifyReq
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients required' })
  }

  const results = await Promise.all(
    recipients.map((r) =>
      transporter.sendMail({
        from: process.env.MAIL_FROM ?? '"QMR Document Delivery" <qmr@hospital.go.th>',
        to: `"${r.name}" <${r.email}>`,
        subject: `[QMR] เอกสารใหม่ ${documentCode ?? ''} — โปรดรับทราบ`,
        text: `เรียน ${r.name}\n\n${message}\n\nกรุณาเข้าระบบเพื่อลงนามรับทราบ: https://zank001.github.io/my-web-app/\n\nQMR Office`,
        html: `
          <p>เรียน ${r.name}</p>
          <p>${message}</p>
          <p>กรุณา <a href="https://zank001.github.io/my-web-app/">เข้าระบบเพื่อลงนามรับทราบ</a></p>
          <hr/>
          <p style="color:#64748b;font-size:12px">QMR Office · ${documentCode ?? ''}</p>
        `,
      }),
    ),
  )

  res.json({ ok: true, sent: results.length, results })
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const port = Number(process.env.PORT ?? 8080)
app.listen(port, () => {
  console.log(`[qmr] notify server listening on :${port}`)
})
