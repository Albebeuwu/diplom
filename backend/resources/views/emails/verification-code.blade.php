<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #450a0a;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            color: #450a0a;
            text-align: center;
            padding: 20px;
            background-color: #fff;
            border: 2px dashed #450a0a;
            border-radius: 5px;
            margin: 20px 0;
            letter-spacing: 5px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
        .warning {
            color: #dc2626;
            font-size: 14px;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ФанЛит</h1>
    </div>
    
    <div class="content">
        <h2>Здравствуйте!</h2>
        
        @if($type === 'registration')
            <p>Вы начали процесс регистрации на нашем сайте. Для подтверждения вашего email адреса используйте следующий код:</p>
        @else
            <p>Вы запросили восстановление пароля. Для создания нового пароля используйте следующий код:</p>
        @endif
        
        <div class="code">{{ $code }}</div>
        
        <p>Код действителен в течение 15 минут.</p>
        
        <div class="warning">
            ⚠️ Никому не сообщайте этот код! Сотрудники сайта никогда не запрашивают коды подтверждения.
        </div>
    </div>
    
    <div class="footer">
        <p>Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
        <p>&copy; {{ date('Y') }} Фанфики. Все права защищены.</p>
    </div>
</body>
</html>