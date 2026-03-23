param (
    [Parameter(Mandatory = $true)]
    [string]$xmlPath,

    [Parameter(Mandatory = $true)]
    [string]$outputPath
)

if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
}

Write-Host "Loading XML: $xmlPath"
[xml]$xmlDoc = New-Object System.Xml.XmlDocument
$xmlDoc.Load($xmlPath)

$items = $xmlDoc.SelectNodes("//item")
$processedCount = 0
$fileNames = @{}

foreach ($item in $items) {
    $titleNode = $item.SelectSingleNode("title")
    $captionsNodes = $item.SelectNodes("captions")

    if ($titleNode -and $captionsNodes.Count -gt 0) {
        $title = $titleNode.InnerText
        
        # Skip empty titles
        if ([string]::IsNullOrWhiteSpace($title)) {
            continue
        }
        
        # Join captions with newlines
        $captions = ($captionsNodes | ForEach-Object { $_.InnerText }) -join "`r`n"
        
        # Unescape HTML entities if any (like &#39;)
        $captions = [System.Net.WebUtility]::HtmlDecode($captions)

        # Sanitize title for filename
        $sanitizedTitle = $title -replace '[\\/:"*?<>|]', '_'
        $sanitizedTitle = $sanitizedTitle.Trim()
        
        # Skip if sanitized title is empty
        if ([string]::IsNullOrWhiteSpace($sanitizedTitle)) {
            continue
        }

        $fileName = "$sanitizedTitle.txt"
        $baseFileName = $sanitizedTitle
        $counter = 0

        # Handle duplicate filenames
        while ($fileNames.ContainsKey($fileName)) {
            $counter++
            $fileName = "$baseFileName (_$counter).txt"
        }
        $fileNames[$fileName] = $true

        # Create full file path - THIS WAS THE MISSING LINE
        $filePath = Join-Path $outputPath $fileName
        
        [System.IO.File]::WriteAllText($filePath, $captions)
        $processedCount++
    }
}

Write-Host "Successfully processed $processedCount items into $outputPath."
