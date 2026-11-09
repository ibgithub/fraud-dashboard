param(
  [string]$In  = "c:\works\ai\AnvAIa-bag\docs\logo-bag.png",
  [string]$Out = "c:\works\ai\AnvAIa-bag\frontend\public\logo-bag.png",
  [int]$Threshold = 238   # pixels with R,G,B all >= threshold become transparent
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($In)
$w = $src.Width; $h = $src.Height
Write-Output "In: $w x $h"

# Sample a few corners to confirm the background is white/near-white.
foreach ($pt in @(,@(0,0)) + @(,@(($w-1),0)) + @(,@(0,($h-1))) + @(,@(($w-1),($h-1)))) {
  $c = $src.GetPixel([int]$pt[0], [int]$pt[1])
  Write-Output ("corner({0},{1}) = A{2} R{3} G{4} B{5}" -f $pt[0],$pt[1],$c.A,$c.R,$c.G,$c.B)
}

$dst = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$changed = 0
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $c = $src.GetPixel($x, $y)
    if ($c.R -ge $Threshold -and $c.G -ge $Threshold -and $c.B -ge $Threshold) {
      $dst.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
      $changed++
    } else {
      $dst.SetPixel($x, $y, $c)
    }
  }
}

$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Out: $Out  (made $changed px transparent, threshold=$Threshold)"
$src.Dispose(); $dst.Dispose()
