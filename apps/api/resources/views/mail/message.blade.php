{{-- One plain right-to-left message: a heading, a few lines, one button, small print. --}}
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $heading }}</title>
</head>
<body style="margin:0;padding:24px 16px;background:#ffffff;color:#1f1a17;font-family:Tahoma,Arial,sans-serif;font-size:16px;line-height:1.7;direction:rtl;text-align:right;">
<div style="max-width:520px;margin:0 auto;">
<h1 style="font-size:20px;margin:0 0 16px;">{{ $heading }}</h1>
@foreach ($lines as $line)
<p style="margin:0 0 12px;">{{ $line }}</p>
@endforeach
<p style="margin:24px 0;"><a href="{{ $url }}" style="display:inline-block;padding:12px 24px;background:#1f1a17;color:#ffffff;text-decoration:none;border-radius:999px;">{{ $button }}</a></p>
@foreach ($notes as $note)
<p style="margin:0 0 8px;font-size:14px;color:#5c534d;">{{ $note }}</p>
@endforeach
<p style="margin:16px 0 0;font-size:14px;color:#5c534d;">إن لم يعمل الزر، انسخي هذا الرابط في المتصفح:</p>
<p style="margin:4px 0 0;font-size:13px;direction:ltr;text-align:left;word-break:break-all;"><a href="{{ $url }}" style="color:#5c534d;">{{ $url }}</a></p>
</div>
</body>
</html>
