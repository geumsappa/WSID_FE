# 시뮬레이션 사진 소품용 실제 사진을 public/sim-photos 에 받아 둬요 (한 번만 실행).
# 실행: WSID_FE 폴더에서  powershell -ExecutionPolicy Bypass -File scripts\download-sim-photos.ps1
# 받아 두지 않아도 화면은 Unsplash 원본 주소로 보여 주지만, 인터넷이 없거나 느린 시연장에서는 로컬 사본이 안전해요.
$ErrorActionPreference = 'Stop'
$dir = Join-Path $PSScriptRoot '..\public\sim-photos'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$photos = [ordered]@{
  'microwave' = 'https://images.unsplash.com/photo-1630699293875-e56c25151c4b?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.52&fp-y=0.33&fp-z=2.6&q=72&fm=jpg'
  'laptop' = 'https://images.unsplash.com/photo-1654267288787-a571aecf0505?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=1&q=72&fm=jpg'
  'phone' = 'https://images.unsplash.com/photo-1709722321440-e03db4ab9eca?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.45&fp-y=0.45&fp-z=1.2&q=72&fm=jpg'
  'console' = 'https://images.unsplash.com/photo-1755589614356-bf6d276f5ca5?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.4&fp-y=0.5&fp-z=1&q=72&fm=jpg'
  'bike' = 'https://images.unsplash.com/photo-1692152004188-df5b3c9447fe?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.55&fp-z=1&q=72&fm=jpg'
  'bag' = 'https://images.unsplash.com/photo-1612902456551-333ac5afa26e?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=1&q=72&fm=jpg'
  'shoes' = 'https://images.unsplash.com/photo-1634671494478-18ae96453241?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.55&fp-z=1.2&q=72&fm=jpg'
  'camera' = 'https://images.unsplash.com/photo-1698502453332-03fa2ddceb71?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.55&fp-y=0.5&fp-z=1&q=72&fm=jpg'
  'box' = 'https://images.unsplash.com/photo-1631010231931-d2c396b444ec?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=1&q=72&fm=jpg'
  'cardboard' = 'https://images.unsplash.com/photo-1631010231931-d2c396b444ec?w=900&h=675&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.3&fp-z=2.6&q=72&fm=jpg'
}
foreach ($name in $photos.Keys) {
  $out = Join-Path $dir "$name.jpg"
  Write-Host "받는 중: $name"
  Invoke-WebRequest -Uri $photos[$name] -OutFile $out -UseBasicParsing
}
Write-Host "완료: $dir"
