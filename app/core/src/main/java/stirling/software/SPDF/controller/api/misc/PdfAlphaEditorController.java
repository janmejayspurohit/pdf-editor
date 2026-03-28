package stirling.software.SPDF.controller.api.misc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.pixee.security.Filenames;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.SPDF.service.PdfAlphaEditorService;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.WebResponseUtils;

@RestController
@RequestMapping("/api/v1/pdf/alpha-editor")
@Tag(name = "PDF Alpha Editor", description = "In-place text editing for PDFs")
@Slf4j
@RequiredArgsConstructor
public class PdfAlphaEditorController {

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final PdfAlphaEditorService pdfAlphaEditorService;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public record CharData(int charIndex, float x, float y, float w, float h, String ch) {}

    public record PageTextData(int pageIndex, List<CharData> chars) {}

    public record AlphaEditorChange(
            int pageIndex,
            String originalText,
            String replacementText,
            float x,
            float y,
            float width,
            float height) {}

    @PostMapping(value = "/extract-text", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extract character-level text positions from a PDF")
    public ResponseEntity<List<PageTextData>> extractText(
            @RequestParam("file") MultipartFile file) throws IOException {
        try (PDDocument document = pdfDocumentFactory.load(file)) {
            List<PageTextData> result = extractAllPages(document);
            return ResponseEntity.ok(result);
        }
    }

    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Apply text changes to a PDF")
    public ResponseEntity<byte[]> apply(
            @RequestParam("file") MultipartFile file,
            @RequestPart("changes") byte[] changesJson) throws IOException {
        List<AlphaEditorChange> changes =
                OBJECT_MAPPER.readValue(changesJson, new TypeReference<List<AlphaEditorChange>>() {});
        try (PDDocument document = pdfDocumentFactory.load(file)) {
            pdfAlphaEditorService.applyChanges(document, changes);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            String outputName =
                    GeneralUtils.generateFilename(
                            Filenames.toSimpleFileName(file.getOriginalFilename()),
                            "_edited.pdf");
            return WebResponseUtils.bytesToWebResponse(baos.toByteArray(), outputName);
        }
    }

    private List<PageTextData> extractAllPages(PDDocument document) throws IOException {
        List<List<CharData>> perPage = new ArrayList<>();
        int pageCount = document.getNumberOfPages();
        for (int i = 0; i < pageCount; i++) {
            perPage.add(new ArrayList<>());
        }

        CharExtractor stripper = new CharExtractor(document, perPage);
        stripper.setSortByPosition(true);
        stripper.getText(document);

        List<PageTextData> result = new ArrayList<>(pageCount);
        for (int i = 0; i < pageCount; i++) {
            result.add(new PageTextData(i, perPage.get(i)));
        }
        return result;
    }

    private static class CharExtractor extends PDFTextStripper {

        private final PDDocument document;
        private final List<List<CharData>> perPage;
        private int currentPageIndex = 0;

        CharExtractor(PDDocument document, List<List<CharData>> perPage) throws IOException {
            this.document = document;
            this.perPage = perPage;
        }

        @Override
        protected void startPage(PDPage page) throws IOException {
            super.startPage(page);
            currentPageIndex = getCurrentPageNo() - 1;
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) {
            List<CharData> pageChars = perPage.get(currentPageIndex);
            PDPage page = document.getPage(currentPageIndex);
            float pageHeight = page.getMediaBox().getHeight();
            for (TextPosition tp : positions) {
                if (tp == null) {
                    continue;
                }
                float cssY = pageHeight - tp.getY();
                pageChars.add(new CharData(
                        pageChars.size(),
                        tp.getX(),
                        cssY,
                        tp.getWidth(),
                        tp.getHeight(),
                        tp.getUnicode()));
            }
        }
    }
}
