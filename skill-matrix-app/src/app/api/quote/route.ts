import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { company, name, email, phone, message } = await request.json();

    // Validate inputs
    if (!company || !name || !email || !message) {
      return NextResponse.json(
        { error: 'Company, name, email, and message are required' },
        { status: 400 }
      );
    }

    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'cosotomed@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch {
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }

    // Email content
    const mailOptions = {
      from: 'ComPilot Quote Request <noreply@yourdomain.com>',
      to: 'cosotomed@gmail.com',
      subject: `[ComPilot Quote Request] from ${company}`,
      text: `Company: ${company}\nContact: ${name}\nUser Email: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`,
      html: `
        <h3>New Quote Request from ComPilot</h3>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Contact:</strong> ${name}</p>
        <p><strong>User Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <div style="margin-top: 20px;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (sendError: unknown) {
      let errorMessage = 'Unknown error';
      if (sendError instanceof Error) {
        errorMessage = sendError.message;
      }
      return NextResponse.json(
        { error: 'Failed to send email', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: 'Server error', details: errorMessage },
      { status: 500 }
    );
  }
} 