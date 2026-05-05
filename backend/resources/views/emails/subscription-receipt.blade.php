<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Чек об оплате подписки</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #1a0a0a 0%, #2d1515 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .receipt-title {
            text-align: center;
            margin-bottom: 30px;
        }
        .receipt-title h2 {
            color: #2d1515;
            margin: 0 0 5px;
            font-size: 24px;
        }
        .receipt-title p {
            color: #666;
            margin: 0;
            font-size: 14px;
        }
        .receipt-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #ff6b35;
        }
        .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .receipt-row:last-child {
            border-bottom: none;
        }
        .receipt-label {
            font-weight: 600;
            color: #555;
        }
        .receipt-value {
            color: #333;
            font-weight: 500;
        }
        .total-row {
            background: linear-gradient(135deg, #ff6b35 0%, #ff4757 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: 700;
        }
        .plan-details {
            background: #fff3e0;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .plan-name {
            font-size: 20px;
            font-weight: 700;
            color: #ff6b35;
            margin-bottom: 5px;
        }
        .plan-price {
            font-size: 28px;
            font-weight: 700;
            color: #2d1515;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #ff6b35, #ff4757);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 25px;
            margin-top: 20px;
            font-weight: 600;
        }
        .success-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
            }
            .content {
                padding: 20px;
            }
            .receipt-row {
                flex-direction: column;
            }
            .receipt-value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ФанЛит</h1>
            <p>Платформа для любителей фанфиков</p>
        </div>
        
        <div class="content">
            <div class="success-icon">✅</div>
            <div class="receipt-title">
                <h2>Чек об оплате</h2>
                <p>Ваш платёж успешно прошёл</p>
            </div>
            
            <div class="receipt-card">
                <div class="receipt-row">
                    <span class="receipt-label">Номер транзакции:</span>
                    <span class="receipt-value">{{ $transactionId }}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Дата платежа:</span>
                    <span class="receipt-value">{{ $paymentDate }}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Способ оплаты:</span>
                    <span class="receipt-value">{{ $paymentMethod }}</span>
                </div>
            </div>
            
            <div class="plan-details">
                <div class="plan-name">{{ $planName }}</div>
                <div class="plan-price">{{ number_format($planPrice, 0, ',', ' ') }} ₽</div>
                <div style="margin-top: 10px; color: #666;">на 1 месяц</div>
            </div>
            
            <div class="receipt-card">
                <div class="receipt-row">
                    <span class="receipt-label">Плательщик:</span>
                    <span class="receipt-value">{{ $userName }}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Email:</span>
                    <span class="receipt-value">{{ $userEmail }}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Дата активации:</span>
                    <span class="receipt-value">{{ $startDate }}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Действительна до:</span>
                    <span class="receipt-value">{{ $endDate }}</span>
                </div>
            </div>
            
            <div class="total-row">
                <span>ИТОГО К ОПЛАТЕ:</span>
                <span>{{ number_format($planPrice, 0, ',', ' ') }} ₽</span>
            </div>
            
            <div style="text-align: center;">
                <a href="{{ url('/profile?tab=subscription') }}" class="button">Перейти к подписке</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Это письмо сформировано автоматически. Пожалуйста, не отвечайте на него.</p>
            <p>© {{ date('Y') }} ФанЛит. Все права защищены.</p>
            <p>Если у вас возникли вопросы, свяжитесь с нашей службой поддержки: support@fanlit.ru</p>
        </div>
    </div>
</body>
</html>