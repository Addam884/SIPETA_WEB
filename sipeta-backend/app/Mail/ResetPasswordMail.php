<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $otp;

    public function __construct($otp)
    {
        $this->otp = $otp;
    }

    public function build()
    {
        return $this->subject('Kode OTP Reset Password SIPETA')
                    ->html('
                        <h3>Reset Password SIPETA</h3>
                        <p>Kode OTP kamu adalah: <strong>' . $this->otp . '</strong></p>
                        <p>Kode ini hanya berlaku selama 15 menit.</p>
                        <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
                    ');
    }
}