<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Akun Kontingen Anda Telah Siap · SMART-PERKEMI</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background-color: #0f0d0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .credential-col { display: block !important; width: 100% !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0d0b; color: #f5f0eb;">

    <!-- Top spacer -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 30px 15px 40px;">
                
                <!-- Main Container -->
                <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background: #171412; border-radius: 16px; overflow: hidden; border: 1px solid rgba(212, 168, 67, 0.25); box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #781d13 0%, #a82718 50%, #c0392b 100%); padding: 36px 30px; text-align: center; border-bottom: 2px solid #d4a843;">
                            <div style="display: inline-block; padding: 6px 14px; background: rgba(0,0,0,0.35); border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 9999px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #f5d77f; font-weight: 700; margin-bottom: 12px;">
                                PERSAUDARAAN BELADIRI KEMPO INDONESIA
                            </div>
                            <h1 style="margin: 0 0 6px; font-size: 24px; line-height: 1.3; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                                SMART-PERKEMI
                            </h1>
                            <p style="margin: 0; font-size: 13px; color: #fce7b0; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                                Piala Walikota Surabaya 2026
                            </p>
                        </td>
                    </tr>

                    <!-- Main Body Content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 36px 36px 20px;">
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 12px; font-size: 13px; color: #d4a843; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                Konfirmasi Pendaftaran Akun
                            </p>
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.4;">
                                Halo, {{ $contingent->manager_name ?? $user->name }}!
                            </h2>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cfc7bd;">
                                Akun kontingen resmi untuk <strong style="color: #ffffff;">{{ $contingent->name }}</strong> telah berhasil didaftarkan di sistem informasi kejuaraan <strong style="color: #ffffff;">SMART-PERKEMI</strong>. Gunakan kredensial resmi di bawah ini untuk masuk ke portal pendaftaran atlet dan official.
                            </p>

                            <!-- Credentials Box (GOLD / CRIMSON ACCENT) -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #211c18; border-radius: 12px; border: 1px solid rgba(212, 168, 67, 0.4); margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4a843; font-weight: 700; margin-bottom: 14px;">
                                            Kredensial Login Anda
                                        </div>

                                        <!-- Email Row -->
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; color: #9c9489; text-transform: uppercase; font-weight: 600; padding-bottom: 4px;">Email</td>
                                                <td width="70%" style="font-size: 14px; color: #ffffff; font-weight: 600; word-break: break-all;">
                                                    {{ $user->email }}
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Generated Password Highlight Row -->
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: rgba(192, 57, 43, 0.15); border: 1px dashed rgba(212, 168, 67, 0.5); border-radius: 8px; padding: 10px 14px;">
                                            <tr>
                                                <td width="30%" style="font-size: 12px; color: #f5d77f; text-transform: uppercase; font-weight: 700;">
                                                    Password
                                                </td>
                                                <td width="70%" style="font-family: 'Courier New', Courier, monospace; font-size: 18px; color: #ffffff; font-weight: 800; letter-spacing: 2px;">
                                                    {{ $plainPassword }}
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 12px 0 0; font-size: 11px; color: #a89f92; line-height: 1.5;">
                                            ⚠️ <em>Password di-generate otomatis secara acak oleh sistem demi keamanan. Simpan atau ubah password ini setelah berhasil login.</em>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Contingent Information Summary -->
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #d4a843; margin-bottom: 12px;">
                                Ringkasan Data Kontingen
                            </div>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #1c1815; border-radius: 10px; border: 1px solid #2e2822; margin-bottom: 28px; font-size: 13px;">
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #8e8579; width: 35%;">Nama Kontingen</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #ffffff; font-weight: 600;">{{ $contingent->name }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #8e8579;">Kabupaten / Kota</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #ffffff;">{{ $contingent->city }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #8e8579;">Nama Manager</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #ffffff;">{{ $contingent->manager_name }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #8e8579;">WhatsApp / No. HP</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #2e2822; color: #ffffff;">{{ $contingent->phone }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; color: #8e8579; vertical-align: top;">Alamat Domisili</td>
                                    <td style="padding: 10px 16px; color: #d0c8be; line-height: 1.4;">{{ $contingent->address }}</td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $loginUrl }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #c0392b 0%, #96281b 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; padding: 14px 36px; border-radius: 8px; border: 1px solid rgba(212, 168, 67, 0.6); box-shadow: 0 4px 15px rgba(192, 57, 43, 0.4);">
                                            MASUK KE PORTAL KONTINGEN &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Helpful Tips -->
                            <div style="background: rgba(212, 168, 67, 0.08); border-left: 3px solid #d4a843; padding: 12px 16px; border-radius: 4px; margin-bottom: 10px;">
                                <p style="margin: 0; font-size: 12px; color: #e2d9cd; line-height: 1.5;">
                                    <strong style="color: #f5d77f;">Langkah Selanjutnya:</strong> Setelah berhasil masuk, Anda dapat melengkapi berkas administrasi kontingen, mendaftarkan nomor tanding Embu dan Randori, serta mencetak kartu tanda peserta (ID Card).
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #110e0c; padding: 24px 30px; text-align: center; border-top: 1px solid #26211c;">
                            <p style="margin: 0 0 6px; font-size: 12px; color: #8a8175; font-weight: 500;">
                                Panitia Pelaksana Kejuaraan Antar Dojo Shorinji Kempo
                            </p>
                            <p style="margin: 0 0 12px; font-size: 11px; color: #6b6358;">
                                Sekretariat PERKEMI · Surabaya, Jawa Timur, Indonesia
                            </p>
                            <p style="margin: 0; font-size: 10px; color: #524b42;">
                                &copy; {{ date('Y') }} SMART-PERKEMI. Seluruh hak cipta dilindungi undang-undang.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
