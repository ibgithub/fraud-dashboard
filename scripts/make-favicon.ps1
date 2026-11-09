param(
  [string]$In   = "c:\works\ai\AnvAIa-bag\frontend\public\logo-bag.png",
  [string]$Out  = "c:\works\ai\AnvAIa-bag\frontend\public\favicon.png",
  [int]$Size    = 64,     # output square size
  [int]$PadPct  = 4,      # transparent padding around the mark, % of Size
  [double]$VStretch = 1.25, # vertical stretch factor applied to the mark (1.0 = none)
  [int]$AlphaThreshold = 16  # pixels with alpha above this count as "content"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($In)
$w = $src.Width; $h = $src.Height

# Find the tight bounding box of non-transparent (content) pixels.
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $a = $src.GetPixel($x, $y).A
    if ($a -gt $AlphaThreshold) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt 0) { Write-Error "No content pixels found"; exit 1 }
$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1
Write-Output "Content bbox: ($minX,$minY) ${cw}x${ch} within ${w}x${h}"

# Crop the content.
$crop = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g0 = [System.Drawing.Graphics]::FromImage($crop)
$g0.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$cw,$ch), $minX, $minY, $cw, $ch, [System.Drawing.GraphicsUnit]::Pixel)
$g0.Dispose()

# Compose onto a transparent square, preserving aspect ratio, centered, with padding.
$dst = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$pad = [int]($Size * $PadPct / 100.0)
$avail = $Size - 2 * $pad
# Effective content height after the optional vertical stretch.
$effCh = $ch * $VStretch
$scale = [Math]::Min($avail / $cw, $avail / $effCh)
$dw = [int]([Math]::Round($cw * $scale))
$dh = [int]([Math]::Round($effCh * $scale))
$dx = [int](($Size - $dw) / 2)
$dy = [int](($Size - $dh) / 2)
$g.DrawImage($crop, (New-Object System.Drawing.Rectangle $dx,$dy,$dw,$dh))
$g.Dispose()

$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved $Out  (${Size}x${Size}, mark ${dw}x${dh} centered, pad=$pad, vstretch=$VStretch)"
$src.Dispose(); $crop.Dispose(); $dst.Dispose()
