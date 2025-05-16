import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendInvitationEmail(email: string, token: string, fileName: string) {
    const appUrl = this.configService.get<string>('APP_URL');
    const invitationUrl = `${appUrl}/register?invitationToken=${token}`;
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Invitation to Collaborate on ${fileName}`,
      html: `<p>You have been invited to collaborate on "${fileName}". Please register using this link: <a href="${invitationUrl}">Register</a></p>`,
    });
  }

  async sendAccessNotification(email: string, fileName: string, role: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: `Access Granted to ${fileName}`,
      html: `<p>You have been granted ${role} access to "${fileName}". Log in to view the file.</p>`,
    });
  }
}