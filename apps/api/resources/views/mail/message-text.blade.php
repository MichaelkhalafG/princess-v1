{{ $heading }}

@foreach ($lines as $line)
{{ $line }}
@endforeach

{{ $button }}:
{!! $url !!}

@foreach ($notes as $note)
{{ $note }}
@endforeach
