<?php

namespace App\Services\Reports;

use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class ReportWorkbook
{
    public function filename(string $reportName, string $eventName): string
    {
        return Str::slug($reportName.' '.$eventName).'.xlsx';
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<int|float|string|null>>  $rows
     */
    public function build(string $title, string $subtitle, array $headers, array $rows): string
    {
        $temporaryFile = tempnam(sys_get_temp_dir(), 'smart-perkemi-report-');

        if ($temporaryFile === false) {
            throw new RuntimeException('Tidak dapat membuat file sementara untuk ekspor laporan.');
        }

        try {
            $archive = new ZipArchive;
            $openResult = $archive->open($temporaryFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

            if ($openResult !== true) {
                throw new RuntimeException('Tidak dapat membuka arsip Excel laporan.');
            }

            foreach ($this->workbookFiles($title, $subtitle, $headers, $rows) as $path => $contents) {
                if (! $archive->addFromString($path, $contents)) {
                    $archive->close();

                    throw new RuntimeException("Tidak dapat menambahkan {$path} ke file Excel.");
                }
            }

            if (! $archive->close()) {
                throw new RuntimeException('Tidak dapat menyelesaikan file Excel laporan.');
            }

            $contents = file_get_contents($temporaryFile);

            if ($contents === false) {
                throw new RuntimeException('Tidak dapat membaca file Excel laporan.');
            }

            return $contents;
        } finally {
            if (is_file($temporaryFile)) {
                unlink($temporaryFile);
            }
        }
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<int|float|string|null>>  $rows
     * @return array<string, string>
     */
    private function workbookFiles(string $title, string $subtitle, array $headers, array $rows): array
    {
        return [
            '[Content_Types].xml' => $this->contentTypesXml(),
            '_rels/.rels' => $this->rootRelationshipsXml(),
            'docProps/app.xml' => $this->appPropertiesXml(),
            'docProps/core.xml' => $this->corePropertiesXml($title),
            'xl/workbook.xml' => $this->workbookXml(Str::limit($title, 31, '')),
            'xl/_rels/workbook.xml.rels' => $this->workbookRelationshipsXml(),
            'xl/styles.xml' => $this->stylesXml(),
            'xl/worksheets/sheet1.xml' => $this->worksheetXml($title, $subtitle, $headers, $rows),
        ];
    }

    private function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
XML;
    }

    private function rootRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
XML;
    }

    private function appPropertiesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SMART PERKEMI</Application><AppVersion>1.0</AppVersion></Properties>
XML;
    }

    private function corePropertiesXml(string $title): string
    {
        $createdAt = now()->utc()->format('Y-m-d\TH:i:s\Z');

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            .'<dc:title>'.$this->escape($title).'</dc:title><dc:creator>SMART PERKEMI</dc:creator>'
            .'<dcterms:created xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:created>'
            .'<dcterms:modified xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:modified></cp:coreProperties>';
    }

    private function workbookXml(string $sheetName): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets><sheet name="'.$this->escape($sheetName).'" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>';
    }

    private function workbookRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
XML;
    }

    private function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="17"/><color rgb="FFF0C060"/><name val="Aptos Display"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17120F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFAF8F5"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE5DED4"/></left><right style="thin"><color rgb="FFE5DED4"/></right><top style="thin"><color rgb="FFE5DED4"/></top><bottom style="thin"><color rgb="FFE5DED4"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>
XML;
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<int|float|string|null>>  $dataRows
     */
    private function worksheetXml(string $title, string $subtitle, array $headers, array $dataRows): string
    {
        $columnCount = max(count($headers), 1);
        $lastColumn = $this->column($columnCount);
        $rows = [
            $this->row(1, [$this->inlineCell('A1', $title, 1)], 28),
            $this->row(2, [$this->inlineCell('A2', $subtitle, 2)], 34),
            $this->row(4, collect($headers)->map(fn (string $header, int $index): string => $this->inlineCell($this->column($index + 1).'4', $header, 3))->all(), 30),
        ];

        foreach ($dataRows as $index => $values) {
            $rowNumber = $index + 5;
            $cells = [];

            foreach (array_values($values) as $columnIndex => $value) {
                $reference = $this->column($columnIndex + 1).$rowNumber;
                $cells[] = is_int($value) || is_float($value)
                    ? $this->numberCell($reference, $value, 4)
                    : $this->inlineCell($reference, (string) ($value ?? ''), 4);
            }

            $rows[] = $this->row($rowNumber, $cells, 34);
        }

        $lastRow = max(4, count($dataRows) + 4);
        $columns = collect(range(1, $columnCount))->map(function (int $column) use ($headers, $dataRows): string {
            $lengths = collect($dataRows)->map(fn (array $row): int => mb_strlen((string) ($row[$column - 1] ?? '')));
            $width = min(48, max(12, mb_strlen($headers[$column - 1] ?? '') + 3, (int) $lengths->max() + 2));

            return '<col min="'.$column.'" max="'.$column.'" width="'.$width.'" customWidth="1"/>';
        })->implode('');

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
            .'<dimension ref="A1:'.$lastColumn.$lastRow.'"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/><cols>'.$columns.'</cols><sheetData>'.implode('', $rows).'</sheetData>'
            .'<autoFilter ref="A4:'.$lastColumn.$lastRow.'"/><mergeCells count="2"><mergeCell ref="A1:'.$lastColumn.'1"/><mergeCell ref="A2:'.$lastColumn.'2"/></mergeCells>'
            .'<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
    }

    /** @param list<string> $cells */
    private function row(int $number, array $cells, int $height): string
    {
        return '<row r="'.$number.'" ht="'.$height.'" customHeight="1">'.implode('', $cells).'</row>';
    }

    private function inlineCell(string $reference, string $value, int $style): string
    {
        return '<c r="'.$reference.'" s="'.$style.'" t="inlineStr"><is><t xml:space="preserve">'.$this->escape($value).'</t></is></c>';
    }

    private function numberCell(string $reference, int|float $value, int $style): string
    {
        return '<c r="'.$reference.'" s="'.$style.'"><v>'.rtrim(rtrim(sprintf('%.10F', $value), '0'), '.').'</v></c>';
    }

    private function column(int $number): string
    {
        $column = '';

        while ($number > 0) {
            $number--;
            $column = chr(65 + ($number % 26)).$column;
            $number = intdiv($number, 26);
        }

        return $column;
    }

    private function escape(string $value): string
    {
        $sanitized = preg_replace('/[^\x09\x0A\x0D\x20-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value) ?? '';

        return htmlspecialchars($sanitized, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
