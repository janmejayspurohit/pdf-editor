package stirling.software.SPDF.service;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.COSArray;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSString;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdfwriter.ContentStreamWriter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.SPDF.controller.api.misc.PdfAlphaEditorController.AlphaEditorChange;

@Service
@Slf4j
@RequiredArgsConstructor
public class PdfAlphaEditorService {

    public void applyChanges(PDDocument document, List<AlphaEditorChange> changes)
            throws IOException {
        for (AlphaEditorChange change : changes) {
            boolean patched = tryPrimaryPatch(document, change);
            if (!patched) {
                log.warn(
                        "Alpha editor: primary patch failed for '{}' on page {}, using fallback",
                        change.originalText(),
                        change.pageIndex());
                applyFallbackPatch(document, change);
            }
        }
    }

    private boolean tryPrimaryPatch(PDDocument document, AlphaEditorChange change)
            throws IOException {
        PDPage page = document.getPage(change.pageIndex());
        try {
            PDFStreamParser parser = new PDFStreamParser(page);
            List<Object> tokens = parser.parse();
            boolean modified = replaceTextToken(tokens, change);
            if (!modified) {
                return false;
            }
            writeTokensToPage(document, page, tokens);
            return true;
        } catch (IOException e) {
            log.debug("Primary patch IOException for page {}: {}", change.pageIndex(), e.getMessage());
            return false;
        }
    }

    private boolean replaceTextToken(List<Object> tokens, AlphaEditorChange change) {
        for (int i = 1; i < tokens.size(); i++) {
            Object token = tokens.get(i);
            if (!(token instanceof Operator op)) {
                continue;
            }
            if ("Tj".equals(op.getName())) {
                if (tryReplaceTj(tokens, i, change)) {
                    return true;
                }
            } else if ("TJ".equals(op.getName())) {
                if (tryReplaceTJ(tokens, i, change)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean tryReplaceTj(List<Object> tokens, int opIndex, AlphaEditorChange change) {
        if (!(tokens.get(opIndex - 1) instanceof COSString cosStr)) {
            return false;
        }
        String text = cosStr.getString();
        if (!change.originalText().equals(text)) {
            return false;
        }
        tokens.set(opIndex - 1, new COSString(change.replacementText()));
        return true;
    }

    private boolean tryReplaceTJ(List<Object> tokens, int opIndex, AlphaEditorChange change) {
        if (!(tokens.get(opIndex - 1) instanceof COSArray array)) {
            return false;
        }
        StringBuilder combined = new StringBuilder();
        for (int j = 0; j < array.size(); j++) {
            COSBase item = array.get(j);
            if (item instanceof COSString cs) {
                combined.append(cs.getString());
            }
        }
        if (!change.originalText().equals(combined.toString())) {
            return false;
        }
        COSArray replacement = new COSArray();
        replacement.add(new COSString(change.replacementText()));
        tokens.set(opIndex - 1, replacement);
        return true;
    }

    private void writeTokensToPage(PDDocument document, PDPage page, List<Object> tokens)
            throws IOException {
        PDStream newStream = new PDStream(document);
        try (OutputStream out = newStream.createOutputStream(COSName.FLATE_DECODE)) {
            new ContentStreamWriter(out).writeTokens(tokens);
        }
        page.setContents(newStream);
    }

    private void applyFallbackPatch(PDDocument document, AlphaEditorChange change)
            throws IOException {
        PDPage page = document.getPage(change.pageIndex());
        float pageHeight = page.getMediaBox().getHeight();
        float pdfY = pageHeight - change.y();

        try (PDPageContentStream cs =
                new PDPageContentStream(document, page, AppendMode.APPEND, true, true)) {
            drawWhiteRect(cs, change, pdfY);
            PDFont font = resolveFontFromPage(page);
            drawReplacementText(cs, font, change, pdfY);
        }
    }

    private void drawWhiteRect(PDPageContentStream cs, AlphaEditorChange change, float pdfY)
            throws IOException {
        cs.setNonStrokingColor(1f, 1f, 1f);
        cs.addRect(change.x(), pdfY - change.height(), change.width(), change.height());
        cs.fill();
    }

    private void drawReplacementText(
            PDPageContentStream cs, PDFont font, AlphaEditorChange change, float pdfY)
            throws IOException {
        float fontSize = change.height() > 0 ? change.height() : 10f;
        cs.setNonStrokingColor(0f, 0f, 0f);
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(change.x(), pdfY - change.height());
        cs.showText(change.replacementText());
        cs.endText();
    }

    private PDFont resolveFontFromPage(PDPage page) {
        PDResources resources = page.getResources();
        if (resources != null) {
            for (COSName fontName : resources.getFontNames()) {
                try {
                    PDFont candidate = resources.getFont(fontName);
                    if (candidate != null) {
                        return candidate;
                    }
                } catch (IOException e) {
                    log.debug("Could not load font '{}' from page resources", fontName.getName());
                }
            }
        }
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    }
}
