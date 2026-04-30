import { Resend } from 'resend'
import { env } from '../../shared/env'
import type { IEmailService, SendInviteParams, SendPasswordResetParams } from './IEmailService'

export class ResendEmailService implements IEmailService {
  private readonly client = new Resend(env.RESEND_API_KEY)
  private readonly from = env.EMAIL_FROM

  async sendInvite({ to, fullName, invitedByName, acceptUrl }: SendInviteParams) {
    await this.client.emails.send({
      from: this.from,
      to,
      subject: 'Convite para Tribo Verde — Gestão Financeira',
      html: `
        <p>Olá ${fullName},</p>
        <p>${invitedByName} convidou-te para aceder à plataforma financeira da Tribo Verde.</p>
        <p>
          <a href="${acceptUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Aceitar convite
          </a>
        </p>
        <p>Este link expira em 72 horas.</p>
      `,
    })
  }

  async sendPasswordReset({ to, fullName, resetUrl }: SendPasswordResetParams) {
    await this.client.emails.send({
      from: this.from,
      to,
      subject: 'Repor palavra-passe — Tribo Verde',
      html: `
        <p>Olá ${fullName},</p>
        <p>Clica no link abaixo para repor a tua palavra-passe. O link expira em 1 hora.</p>
        <p>
          <a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
            Repor palavra-passe
          </a>
        </p>
        <p>Se não pediste esta alteração, ignora este email.</p>
      `,
    })
  }
}
