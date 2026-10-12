<?php

namespace App\Services;

use App\Models\Event;
use App\Models\TournamentMatch;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class TournamentScheduleWorkbook
{
    public function filename(Event $event): string
    {
        return 'jadwal-pertandingan-'.Str::slug($event->name).'.xlsx';
    }

    public function build(Event $event): string
    {
        $matches = $event->tournamentMatches()
            ->where('is_bye', false)
            ->whereNotNull('scheduled_start_at')
            ->with([
                'matchCategory:id,name,type,order',
                'court:id,name,order',
                'rundown:id,name,date,end_time,order',
            ])
            ->get()
            ->sortBy(fn (TournamentMatch $match): array => [
                $match->scheduled_start_at?->timestamp ?? PHP_INT_MAX,
                $match->court?->order ?? PHP_INT_MAX,
                $match->match_sequence,
            ])
            ->values();
        $temporaryFile = tempnam(sys_get_temp_dir(), 'tournament-schedule-');

        if ($temporaryFile === false) {
            throw new RuntimeException('Tidak dapat membuat file sementara untuk ekspor jadwal.');
        }

        try {
            $archive = new ZipArchive;
            $openResult = $archive->open($temporaryFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

            if ($openResult !== true) {
                throw new RuntimeException('Tidak dapat membuka arsip Excel untuk ekspor jadwal.');
            }

            foreach ($this->workbookFiles($event, $matches) as $path => $contents) {
                if (! $archive->addFromString($path, $contents)) {
                    $archive->close();

                    throw new RuntimeException("Tidak dapat menambahkan {$path} ke file Excel.");
                }
            }

            if (! $archive->close()) {
                throw new RuntimeException('Tidak dapat menyelesaikan file Excel jadwal.');
            }

            $contents = file_get_contents($temporaryFile);

            if ($contents === false) {
                throw new RuntimeException('Tidak dapat membaca file Excel jadwal.');
            }

            return $contents;
        } finally {
            if (is_file($temporaryFile)) {
                unlink($temporaryFile);
            }
        }
    }

    /**
     * @param  Collection<int, TournamentMatch>  $matches
     * @return array<string, string>
     */
    private function workbookFiles(Event $event, Collection $matches): array
    {
        return [
            '[Content_Types].xml' => $this->contentTypesXml(),
            '_rels/.rels' => $this->rootRelationshipsXml(),
            'docProps/app.xml' => $this->appPropertiesXml(),
            'docProps/core.xml' => $this->corePropertiesXml($event),
            'xl/workbook.xml' => $this->workbookXml(),
            'xl/_rels/workbook.xml.rels' => $this->workbookRelationshipsXml(),
            'xl/styles.xml' => $this->stylesXml(),
            'xl/worksheets/sheet1.xml' => $this->worksheetXml($event, $matches),
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
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>SMART PERKEMI</Application>
  <AppVersion>1.0</AppVersion>
</Properties>
XML;
    }

    private function corePropertiesXml(Event $event): string
    {
        $createdAt = now()->utc()->format('Y-m-d\TH:i:s\Z');

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            .'<dc:title>'.$this->escape('Jadwal Pertandingan '.$event->name).'</dc:title>'
            .'<dc:creator>SMART PERKEMI</dc:creator>'
            .'<cp:lastModifiedBy>SMART PERKEMI</cp:lastModifiedBy>'
            .'<dcterms:created xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:created>'
            .'<dcterms:modified xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:modified>'
            .'</cp:coreProperties>';
    }

    private function workbookXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="Jadwal Pertandingan" sheetId="1" r:id="rId1"/></sheets>
  <calcPr calcId="0" fullCalcOnLoad="1"/>
</workbook>
XML;
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
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="dd mmm yyyy"/>
    <numFmt numFmtId="165" formatCode="hh:mm"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="18"/><color rgb="FFF0C060"/><name val="Aptos Display"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF17120F"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF1F2"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE5DDD3"/></left><right style="thin"><color rgb="FFE5DDD3"/></right><top style="thin"><color rgb="FFE5DDD3"/></top><bottom style="thin"><color rgb="FFE5DDD3"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>
XML;
    }

    /** @param Collection<int, TournamentMatch> $matches */
    private function worksheetXml(Event $event, Collection $matches): string
    {
        $title = 'Jadwal Pertandingan '.$event->name;
        $eventPeriod = $event->start_date?->translatedFormat('d M Y').' - '.$event->end_date?->translatedFormat('d M Y');
        $eventDetails = implode(' | ', array_filter([$event->venue, $event->city, $eventPeriod]));
        $rows = [
            $this->row(1, [$this->inlineCell('A1', $title, 1)], 28),
            $this->row(2, [$this->inlineCell('A2', $eventDetails, 2)], 20),
            $this->row(3, [$this->inlineCell('A3', 'Durasi pertandingan: '.(int) $event->match_duration_minutes.' menit | Jeda atlet: '.(int) $event->minimum_rest_minutes.' menit', 2)], 20),
            $this->row(5, collect([
                'No.', 'Tanggal', 'Sesi', 'Mulai', 'Selesai', 'Court', 'Jenis', 'Nomor Pertandingan', 'Babak', 'Peserta / Lawan', 'Status',
            ])->map(fn (string $label, int $index): string => $this->inlineCell($this->column($index + 1).'5', $label, 3))->all(), 30),
        ];

        foreach ($matches as $index => $match) {
            $rowNumber = $index + 6;
            $participant = $match->participant_label
                ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label]));
            $type = ucfirst((string) $match->matchCategory?->type);
            $typeStyle = $match->matchCategory?->type === 'embu' ? 8 : 9;
            $rows[] = $this->row($rowNumber, [
                $this->numberCell("A{$rowNumber}", $index + 1, 7),
                $this->numberCell("B{$rowNumber}", $this->excelDate($match->scheduled_start_at), 5),
                $this->inlineCell("C{$rowNumber}", $match->rundown?->name ?? '-', 4),
                $this->numberCell("D{$rowNumber}", $this->excelTime($match->scheduled_start_at), 6),
                $this->numberCell("E{$rowNumber}", $this->excelTime($match->scheduled_end_at), 6),
                $this->inlineCell("F{$rowNumber}", $match->court?->name ?? '-', 7),
                $this->inlineCell("G{$rowNumber}", $type, $typeStyle),
                $this->inlineCell("H{$rowNumber}", $match->matchCategory?->name ?? '-', 4),
                $this->inlineCell("I{$rowNumber}", $match->round_label, 4),
                $this->inlineCell("J{$rowNumber}", $participant !== '' ? $participant : 'Menunggu peserta', 4),
                $this->inlineCell("K{$rowNumber}", $this->statusLabel($match->status), 7),
            ], 36);
        }

        $lastRow = max(5, $matches->count() + 5);

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
            .'<dimension ref="A1:K'.$lastRow.'"/>'
            .'<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/>'
            .'<cols>'
            .'<col min="1" max="1" width="7" customWidth="1"/>'
            .'<col min="2" max="2" width="15" customWidth="1"/>'
            .'<col min="3" max="3" width="24" customWidth="1"/>'
            .'<col min="4" max="5" width="11" customWidth="1"/>'
            .'<col min="6" max="6" width="14" customWidth="1"/>'
            .'<col min="7" max="7" width="12" customWidth="1"/>'
            .'<col min="8" max="8" width="36" customWidth="1"/>'
            .'<col min="9" max="9" width="24" customWidth="1"/>'
            .'<col min="10" max="10" width="46" customWidth="1"/>'
            .'<col min="11" max="11" width="16" customWidth="1"/>'
            .'</cols>'
            .'<sheetData>'.implode('', $rows).'</sheetData>'
            .'<autoFilter ref="A5:K'.$lastRow.'"/>'
            .'<mergeCells count="3"><mergeCell ref="A1:K1"/><mergeCell ref="A2:K2"/><mergeCell ref="A3:K3"/></mergeCells>'
            .'<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'
            .'<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>'
            .'</worksheet>';
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

    private function excelDate(CarbonInterface $date): int
    {
        $timestamp = gmmktime(0, 0, 0, (int) $date->format('m'), (int) $date->format('d'), (int) $date->format('Y'));

        return (int) floor($timestamp / 86400) + 25569;
    }

    private function excelTime(CarbonInterface $date): float
    {
        $seconds = ((int) $date->format('H') * 3600)
            + ((int) $date->format('i') * 60)
            + (int) $date->format('s');

        return $seconds / 86400;
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'live' => 'Sedang berlangsung',
            'finished' => 'Selesai',
            'cancelled' => 'Dibatalkan',
            default => 'Menunggu',
        };
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
