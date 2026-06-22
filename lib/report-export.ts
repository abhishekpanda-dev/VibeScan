import "server-only";

import { formatDateTime } from "@/lib/date";
import type { ReportPassItem } from "@/lib/reporting";
import { createFindingsTotal } from "@/lib/reporting";
import type { SecurityRiskLevel } from "@/lib/scanner/types";
import type {
  ReportExecutiveSummary,
  ReportFinding,
  ReportScoreBreakdown,
  SeverityCounts,
} from "@/types/database";

type ExportableReport = {
  counts: SeverityCounts;
  executiveSummary: ReportExecutiveSummary;
  findings: ReportFinding[];
  findingsCount: number;
  passChecks: ReportPassItem[];
  passCount: number;
  riskLevel: SecurityRiskLevel;
  scan: {
    completedAt: string | null;
    createdAt: string;
    id: string;
    securityScore: number;
    status: string;
    url: string;
  };
  scoreBreakdown: ReportScoreBreakdown;
  topRisks: ReportFinding[];
};

function getFixExportText(finding: ReportFinding) {
  if (finding.fixMarkdown) {
    return finding.fixMarkdown;
  }

  if (finding.severity === "critical" || finding.severity === "high") {
    return "Fix generation unavailable.";
  }

  return "AI fix generation is currently available for critical and high findings only.";
}

function createReportLines(report: ExportableReport) {
  const lines: string[] = [
    "# VibeScan Security Report",
    "",
    `Target URL: ${report.scan.url}`,
    `Date: ${formatDateTime(report.scan.createdAt)}`,
    `Status: ${report.scan.status}`,
    `Security Score: ${report.scan.securityScore} (${report.riskLevel})`,
    "",
    "## Executive Summary",
    "",
    report.executiveSummary.primaryMessage,
    "",
    `- Overall Security Score: ${report.scan.securityScore}`,
    `- Risk Level: ${report.riskLevel}`,
    `- Total Findings: ${report.findingsCount}`,
    `- Critical Findings: ${report.counts.critical}`,
    `- High Findings: ${report.counts.high}`,
    `- Medium Findings: ${report.counts.medium}`,
    `- Low Findings: ${report.counts.low}`,
    `- Passed Checks: ${report.passCount}`,
    `- Top Categories: ${report.executiveSummary.topCategories.join(", ") || "None"}`,
    "",
    "## Risk Overview",
    "",
    `- Severity Distribution: Critical ${report.counts.critical}, High ${report.counts.high}, Medium ${report.counts.medium}, Low ${report.counts.low}, Pass ${report.passCount}`,
    "",
    "### Security Score Breakdown",
    "",
    `- Base Score: ${report.scoreBreakdown.baseScore}`,
    ...report.scoreBreakdown.penalties.map(
      (penalty) =>
        `- ${penalty.label}: ${penalty.count} x ${penalty.penaltyPerItem} = -${penalty.totalPenalty}`,
    ),
    `- Final Score: ${report.scoreBreakdown.finalScore}`,
    "",
    "## Top Risks",
    "",
  ];

  if (report.topRisks.length === 0) {
    lines.push("No top risks were identified.");
    lines.push("");
  } else {
    for (const finding of report.topRisks) {
      lines.push(
        `- [${finding.severity.toUpperCase()}] ${finding.title} (${finding.confidence.label} confidence)`,
      );
    }
    lines.push("");
  }

  lines.push("## Findings");
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No findings were detected.");
    lines.push("");
  }

  for (const finding of report.findings) {
    lines.push(`### [${finding.severity.toUpperCase()}] ${finding.title}`);
    lines.push("");
    lines.push(`- Category: ${finding.category}`);
    lines.push(`- Source Check: ${finding.checkLabel}`);
    lines.push(
      `- Confidence: ${finding.confidence.label} (${finding.confidence.score}/100)`,
    );
    lines.push(`- Validation State: ${finding.validationState}`);
    lines.push(`- Affected Target: ${finding.affectedTarget}`);
    lines.push(`- Risk Explanation: ${finding.riskExplanation}`);
    lines.push(`- Technical Evidence: ${finding.technicalEvidence}`);
    lines.push(`- Impact: ${finding.impact}`);
    lines.push(`- OWASP: ${finding.owasp.join(", ") || "Not mapped"}`);
    lines.push(`- CWE: ${finding.cwe.join(", ") || "Not mapped"}`);
    lines.push("");
    lines.push("#### Reproduction Steps");
    lines.push("");
    for (const step of finding.reproductionSteps) {
      lines.push(`- ${step}`);
    }
    lines.push("");
    lines.push("#### Remediation Steps");
    lines.push("");
    for (const step of finding.remediationSteps) {
      lines.push(`- ${step}`);
    }
    lines.push("");
    lines.push("#### AI Fix");
    lines.push("");
    lines.push(getFixExportText(finding));
    lines.push("");
  }

  lines.push("## Passed Checks");
  lines.push("");

  if (report.passChecks.length === 0) {
    lines.push("No pass checks were recorded.");
    lines.push("");
  } else {
    for (const passCheck of report.passChecks) {
      lines.push(`- ${passCheck.title}: ${passCheck.description}`);
    }
    lines.push("");
  }

  lines.push("## Security Score Breakdown");
  lines.push("");
  lines.push(`Findings counted: ${createFindingsTotal(report.counts)}`);
  lines.push(`Total score penalty: ${report.scoreBreakdown.totalPenalty}`);
  lines.push(`Final score: ${report.scoreBreakdown.finalScore}`);
  lines.push("");

  return lines;
}

export function createMarkdownReport(report: ExportableReport) {
  return `${createReportLines(report).join("\n").trim()}\n`;
}

type PdfRgbColor = unknown;
type PdfFont = {
  heightAtSize(size: number): number;
  widthOfTextAtSize(text: string, size: number): number;
};
type PdfPage = {
  drawRectangle(options: {
    color: PdfRgbColor;
    height: number;
    width: number;
    x: number;
    y: number;
  }): void;
  drawText(
    text: string,
    options: {
      color: PdfRgbColor;
      font: PdfFont;
      size: number;
      x: number;
      y: number;
    },
  ): void;
  getHeight(): number;
  getWidth(): number;
};
type PdfDocument = {
  addPage(size?: [number, number]): PdfPage;
  embedFont(fontName: string): Promise<PdfFont>;
  save(): Promise<Uint8Array>;
};
type PdfLibModule = {
  PDFDocument: {
    create(): Promise<PdfDocument>;
  };
  StandardFonts: {
    Courier: string;
    Helvetica: string;
    HelveticaBold: string;
  };
  rgb(red: number, green: number, blue: number): PdfRgbColor;
};

function splitLongWord(word: string, font: PdfFont, size: number, maxWidth: number) {
  const segments: string[] = [];
  let current = "";

  for (const character of word) {
    const next = `${current}${character}`;

    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      segments.push(current);
      current = character;
      continue;
    }

    current = next;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function wrapText(text: string, font: PdfFont, size: number, maxWidth: number) {
  const lines: string[] = [];

  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    if (!rawLine.trim()) {
      lines.push("");
      continue;
    }

    const words = rawLine.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const segments =
        font.widthOfTextAtSize(word, size) > maxWidth
          ? splitLongWord(word, font, size, maxWidth)
          : [word];

      for (const segment of segments) {
        const candidate = currentLine ? `${currentLine} ${segment}` : segment;

        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          currentLine = candidate;
          continue;
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        currentLine = segment;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function createPdfReport(report: ExportableReport) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfLib = require("../vendor/pdf-lib/pdf-lib.js") as PdfLibModule;
  const pdfDocument = await pdfLib.PDFDocument.create();
  const pageSize: [number, number] = [612, 792];
  const backgroundColor = pdfLib.rgb(0.02, 0.03, 0.06);
  const surfaceColor = pdfLib.rgb(0.07, 0.12, 0.19);
  const accentColor = pdfLib.rgb(0, 0.83, 1);
  const criticalColor = pdfLib.rgb(1, 0.42, 0.42);
  const highColor = pdfLib.rgb(1, 0.82, 0.4);
  const mediumColor = pdfLib.rgb(0.42, 0.85, 1);
  const lowColor = pdfLib.rgb(0.78, 0.82, 0.9);
  const mutedColor = pdfLib.rgb(0.69, 0.75, 0.85);
  const whiteColor = pdfLib.rgb(0.95, 0.97, 1);
  const bodyFont = await pdfDocument.embedFont(pdfLib.StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const codeFont = await pdfDocument.embedFont(pdfLib.StandardFonts.Courier);
  const margin = 44;
  const contentWidth = pageSize[0] - margin * 2;
  let page = pdfDocument.addPage(pageSize);
  let cursorY = pageSize[1] - margin;

  const applyPageBackground = (currentPage: PdfPage) => {
    currentPage.drawRectangle({
      color: backgroundColor,
      height: currentPage.getHeight(),
      width: currentPage.getWidth(),
      x: 0,
      y: 0,
    });

    currentPage.drawRectangle({
      color: surfaceColor,
      height: currentPage.getHeight() - margin * 1.8,
      width: currentPage.getWidth() - margin * 1.8,
      x: margin * 0.9,
      y: margin * 0.9,
    });
  };

  const addPage = () => {
    page = pdfDocument.addPage(pageSize);
    applyPageBackground(page);
    cursorY = pageSize[1] - margin;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < margin) {
      addPage();
    }
  };

  const drawLine = (
    text: string,
    options: {
      color?: PdfRgbColor;
      font?: PdfFont;
      lineHeight?: number;
      size?: number;
    } = {},
  ) => {
    const font = options.font ?? bodyFont;
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size + 4;
    const color = options.color ?? whiteColor;

    ensureSpace(lineHeight);
    page.drawText(text, {
      color,
      font,
      size,
      x: margin,
      y: cursorY - font.heightAtSize(size),
    });
    cursorY -= lineHeight;
  };

  const drawWrappedBlock = (
    text: string,
    options: {
      color?: PdfRgbColor;
      font?: PdfFont;
      lineHeight?: number;
      size?: number;
    } = {},
  ) => {
    const font = options.font ?? bodyFont;
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size + 4;

    for (const line of wrapText(text, font, size, contentWidth)) {
      if (!line) {
        cursorY -= 6;
        continue;
      }

      drawLine(line, {
        color: options.color,
        font,
        lineHeight,
        size,
      });
    }
  };

  applyPageBackground(page);

  drawLine("VibeScan Security Report", {
    color: accentColor,
    font: boldFont,
    lineHeight: 24,
    size: 20,
  });
  cursorY -= 4;
  drawWrappedBlock(`Target URL: ${report.scan.url}`, {
    color: whiteColor,
    font: bodyFont,
    lineHeight: 15,
    size: 11,
  });
  drawLine(`Date: ${formatDateTime(report.scan.createdAt)}`, {
    color: mutedColor,
    size: 10,
  });
  drawLine(
    `Security Score: ${report.scan.securityScore} (${report.riskLevel})`,
    {
      color: whiteColor,
      font: boldFont,
      size: 11,
    },
  );
  drawLine(`Status: ${report.scan.status}`, {
    color: mutedColor,
    size: 10,
  });
  cursorY -= 8;

  drawLine("Executive Summary", {
    color: accentColor,
    font: boldFont,
    lineHeight: 18,
    size: 15,
  });
  drawWrappedBlock(report.executiveSummary.primaryMessage, {
    color: whiteColor,
    lineHeight: 14,
    size: 10,
  });
  drawLine(`Critical Findings: ${report.counts.critical}`, {
    color: criticalColor,
    size: 10,
  });
  drawLine(`High Findings: ${report.counts.high}`, {
    color: highColor,
    size: 10,
  });
  drawLine(`Medium Findings: ${report.counts.medium}`, {
    color: mediumColor,
    size: 10,
  });
  drawLine(`Low Findings: ${report.counts.low}`, {
    color: lowColor,
    size: 10,
  });
  drawLine(`Pass Checks: ${report.passCount}`, {
    color: whiteColor,
    size: 10,
  });
  drawLine(`Findings Total: ${report.findingsCount}`, {
    color: mutedColor,
    size: 10,
  });
  drawLine(
    `Top Categories: ${report.executiveSummary.topCategories.join(", ") || "None"}`,
    {
      color: mutedColor,
      size: 10,
    },
  );
  cursorY -= 8;

  drawLine("Top Risks", {
    color: accentColor,
    font: boldFont,
    lineHeight: 18,
    size: 15,
  });

  if (report.topRisks.length === 0) {
    drawLine("No top risks were identified.", {
      color: whiteColor,
      size: 10,
    });
  } else {
    for (const finding of report.topRisks) {
      drawWrappedBlock(
        `[${finding.severity.toUpperCase()}] ${finding.title} (${finding.confidence.label} confidence)`,
        {
          color: whiteColor,
          lineHeight: 13,
          size: 10,
        },
      );
    }
  }

  cursorY -= 8;

  drawLine("Findings", {
    color: accentColor,
    font: boldFont,
    lineHeight: 18,
    size: 15,
  });

  if (report.findings.length === 0) {
    drawLine("No findings were detected.", {
      color: whiteColor,
      size: 10,
    });
  }

  for (const finding of report.findings) {
    cursorY -= 4;

    const severityColor =
      finding.severity === "critical"
        ? criticalColor
        : finding.severity === "high"
          ? highColor
          : finding.severity === "medium"
            ? mediumColor
            : lowColor;

    drawWrappedBlock(`[${finding.severity.toUpperCase()}] ${finding.title}`, {
      color: severityColor,
      font: boldFont,
      lineHeight: 16,
      size: 12,
    });
    drawLine(`Category: ${finding.category}`, {
      color: mutedColor,
      size: 9,
    });
    drawLine(`Source Check: ${finding.checkLabel}`, {
      color: mutedColor,
      size: 9,
    });
    drawLine(
      `Confidence: ${finding.confidence.label} (${finding.confidence.score}/100)`,
      {
        color: mutedColor,
        size: 9,
      },
    );
    drawWrappedBlock(`Risk: ${finding.riskExplanation}`, {
      color: whiteColor,
      lineHeight: 14,
      size: 10,
    });
    drawWrappedBlock(`Impact: ${finding.impact}`, {
      color: whiteColor,
      lineHeight: 14,
      size: 10,
    });
    drawWrappedBlock(`Affected Target: ${finding.affectedTarget}`, {
      color: mutedColor,
      lineHeight: 13,
      size: 9,
    });
    drawWrappedBlock(`Evidence: ${finding.technicalEvidence}`, {
      color: mutedColor,
      lineHeight: 13,
      size: 9,
    });
    drawWrappedBlock(`OWASP: ${finding.owasp.join(", ") || "Not mapped"}`, {
      color: mutedColor,
      lineHeight: 13,
      size: 9,
    });
    drawWrappedBlock(`CWE: ${finding.cwe.join(", ") || "Not mapped"}`, {
      color: mutedColor,
      lineHeight: 13,
      size: 9,
    });
    drawLine("AI Fix", {
      color: accentColor,
      font: boldFont,
      lineHeight: 14,
      size: 10,
    });
    drawWrappedBlock(getFixExportText(finding), {
      color: whiteColor,
      font: codeFont,
      lineHeight: 12,
      size: 8,
    });
    cursorY -= 6;
  }

  drawLine("Pass Checks", {
    color: accentColor,
    font: boldFont,
    lineHeight: 18,
    size: 15,
  });

  if (report.passChecks.length === 0) {
    drawLine("No pass checks were recorded.", {
      color: whiteColor,
      size: 10,
    });
  } else {
    for (const passCheck of report.passChecks) {
      drawWrappedBlock(`${passCheck.title}: ${passCheck.description}`, {
        color: mutedColor,
        lineHeight: 13,
        size: 9,
      });
    }
  }

  cursorY -= 8;
  drawLine("Security Score Breakdown", {
    color: accentColor,
    font: boldFont,
    lineHeight: 18,
    size: 15,
  });
  drawLine(`Base Score: ${report.scoreBreakdown.baseScore}`, {
    color: whiteColor,
    size: 10,
  });
  for (const penalty of report.scoreBreakdown.penalties) {
    drawLine(
      `${penalty.label}: ${penalty.count} x ${penalty.penaltyPerItem} = -${penalty.totalPenalty}`,
      {
        color: mutedColor,
        size: 9,
      },
    );
  }
  drawLine(`Final Score: ${report.scoreBreakdown.finalScore}`, {
    color: whiteColor,
    font: boldFont,
    size: 10,
  });

  return pdfDocument.save();
}
