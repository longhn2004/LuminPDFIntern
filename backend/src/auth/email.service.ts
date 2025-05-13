import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${this.configService.get('APP_URL')}/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email Address',
      html: `<p>Please verify your email by clicking the link below:</p>
             <a href="${verificationUrl}">Verify Email</a>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}