package stirling.software.SPDF.controller.api.misc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.pixee.security.Filenames;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.WebResponseUtils;

@RestController
@RequestMapping("/api/v1/misc")
@Tag(name = "Misc", description = "Miscellaneous APIs")
@Slf4j
public class FormTextStyleController {

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public FormTextStyleController(CustomPDFDocumentFactory pdfDocumentFactory) {
        this.pdfDocumentFactory = pdfDocumentFactory;
    }

    @PostMapping(value = "/apply-form-text-style", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Apply text style to PDF form fields",
            description = "Embeds form field typography into AcroForm appearances so styling persists in Acrobat")
    public ResponseEntity<byte[]> applyFormTextStyle(
            @RequestParam("fileInput") MultipartFile fileInput,
            @RequestParam(value = "fontFamily", defaultValue = "Helvetica") String fontFamily,
            @RequestParam(value = "fontSize", defaultValue = "14") float fontSize,
            @RequestParam(value = "textColor", defaultValue = "#000000") String textColor,
            @RequestParam(value = "bold", defaultValue = "false") boolean bold,
            @RequestParam(value = "italic", defaultValue = "false") boolean italic,
            @RequestParam(value = "textAlign", defaultValue = "left") String textAlign,
            @RequestParam(value = "textTransform", defaultValue = "none") String textTransform,
            @RequestParam(value = "applyToAll", defaultValue = "true") boolean applyToAll,
            @RequestParam(value = "selectedFieldNames", required = false) List<String> selectedFieldNames)
            throws IOException {

        try (PDDocument document = pdfDocumentFactory.load(fileInput, true)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm == null || acroForm.getFields().isEmpty()) {
                return WebResponseUtils.multiPartFileToWebResponse(fileInput);
            }

            if (acroForm.getDefaultResources() == null) {
                acroForm.setDefaultResources(new PDResources());
            }

            String fontAlias = ensureAndResolveFontAlias(acroForm, fontFamily, bold, italic);
            String rgbOperand = toRgbOperands(textColor);
            int q = toQuadding(textAlign);
            Set<String> selected = new HashSet<>();
            if (selectedFieldNames != null) {
                for (String name : selectedFieldNames) {
                    if (name != null && !name.trim().isEmpty()) {
                        selected.add(name.trim());
                    }
                }
            }

            log.info(
                    "apply-form-text-style request: applyToAll={}, selectedFieldCount={}, selectedFieldNames={}",
                    applyToAll,
                    selected.size(),
                    selected);

            int updated = 0;
            for (PDField field : acroForm.getFieldTree()) {
                if (!(field instanceof PDTextField textField)) {
                    continue;
                }

                if (!applyToAll && !matchesSelectedField(textField, selected)) {
                    continue;
                }

                String value = textField.getValueAsString();
                if (value != null) {
                    textField.setValue(transformText(value, textTransform));
                }

                textField.setQ(q);
                textField.setDefaultAppearance("/" + fontAlias + " " + fontSize + " Tf " + rgbOperand + " rg");
                updated++;
            }

            if (updated > 0) {
                acroForm.refreshAppearances();
                acroForm.setNeedAppearances(false);
            }

            log.info("apply-form-text-style result: updatedFields={}", updated);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            String outputName =
                    GeneralUtils.generateFilename(
                            Filenames.toSimpleFileName(fileInput.getOriginalFilename()),
                            "_styled.pdf");
            return WebResponseUtils.bytesToWebResponse(baos.toByteArray(), outputName);
        }
    }

    @PostMapping(value = "/apply-field-text-styles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Apply per-field text styles to PDF form fields")
    public ResponseEntity<byte[]> applyFieldTextStyles(
            @RequestParam("fileInput") MultipartFile fileInput,
            @RequestParam("fieldStyles") String fieldStylesJson)
            throws IOException {

        Map<String, FieldStyleEntry> fieldStyles =
                OBJECT_MAPPER.readValue(fieldStylesJson, new TypeReference<Map<String, FieldStyleEntry>>() {});

        try (PDDocument document = pdfDocumentFactory.load(fileInput, true)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm == null || acroForm.getFields().isEmpty()) {
                return WebResponseUtils.multiPartFileToWebResponse(fileInput);
            }

            if (acroForm.getDefaultResources() == null) {
                acroForm.setDefaultResources(new PDResources());
            }

            Map<String, String> fontAliasCache = new HashMap<>();
            for (FieldStyleEntry entry : fieldStyles.values()) {
                String cacheKey = entry.fontFamily + "|" + entry.bold + "|" + entry.italic;
                if (!fontAliasCache.containsKey(cacheKey)) {
                    String alias = ensureAndResolveFontAlias(acroForm, entry.fontFamily, entry.bold, entry.italic);
                    fontAliasCache.put(cacheKey, alias);
                }
            }

            int updated = 0;
            for (PDField field : acroForm.getFieldTree()) {
                if (!(field instanceof PDTextField textField)) {
                    continue;
                }

                String fqName = trimToNull(textField.getFullyQualifiedName());
                String partialName = trimToNull(textField.getPartialName());
                FieldStyleEntry entry = fieldStyles.get(fqName);
                if (entry == null) {
                    entry = fieldStyles.get(partialName);
                }
                if (entry == null) {
                    continue;
                }

                String cacheKey = entry.fontFamily + "|" + entry.bold + "|" + entry.italic;
                String fontAlias = fontAliasCache.get(cacheKey);

                textField.setQ(toQuadding(entry.textAlign));
                textField.setDefaultAppearance("/" + fontAlias + " " + entry.fontSize + " Tf " + toRgbOperands(entry.textColor) + " rg");
                textField.setValue(transformText(textField.getValueAsString(), entry.textTransform));
                updated++;
            }

            if (updated > 0) {
                acroForm.refreshAppearances();
                acroForm.setNeedAppearances(false);
            }

            log.info("apply-field-text-styles result: updatedFields={}", updated);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            String outputName =
                    GeneralUtils.generateFilename(
                            Filenames.toSimpleFileName(fileInput.getOriginalFilename()),
                            "_styled.pdf");
            return WebResponseUtils.bytesToWebResponse(baos.toByteArray(), outputName);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class FieldStyleEntry {
        public String fontFamily = "Helvetica";
        public float fontSize = 14f;
        public String textColor = "#000000";
        public boolean bold = false;
        public boolean italic = false;
        public String textAlign = "left";
        public String textTransform = "none";
    }

    private static String ensureAndResolveFontAlias(
            PDAcroForm acroForm, String fontFamily, boolean bold, boolean italic) {
        PDResources resources = acroForm.getDefaultResources();

        String normalized = fontFamily == null ? "helvetica" : fontFamily.toLowerCase(Locale.ROOT);
        Standard14Fonts.FontName fontName;
        String alias;

        if (normalized.contains("times") || normalized.contains("georgia")) {
            if (bold && italic) {
                fontName = Standard14Fonts.FontName.TIMES_BOLD_ITALIC;
                alias = "TiBI";
            } else if (bold) {
                fontName = Standard14Fonts.FontName.TIMES_BOLD;
                alias = "TiBo";
            } else if (italic) {
                fontName = Standard14Fonts.FontName.TIMES_ITALIC;
                alias = "TiIt";
            } else {
                fontName = Standard14Fonts.FontName.TIMES_ROMAN;
                alias = "TiRo";
            }
        } else if (normalized.contains("courier")) {
            if (bold && italic) {
                fontName = Standard14Fonts.FontName.COURIER_BOLD_OBLIQUE;
                alias = "CoBO";
            } else if (bold) {
                fontName = Standard14Fonts.FontName.COURIER_BOLD;
                alias = "CoBo";
            } else if (italic) {
                fontName = Standard14Fonts.FontName.COURIER_OBLIQUE;
                alias = "CoOb";
            } else {
                fontName = Standard14Fonts.FontName.COURIER;
                alias = "Cour";
            }
        } else {
            if (bold && italic) {
                fontName = Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE;
                alias = "HeBO";
            } else if (bold) {
                fontName = Standard14Fonts.FontName.HELVETICA_BOLD;
                alias = "HeBo";
            } else if (italic) {
                fontName = Standard14Fonts.FontName.HELVETICA_OBLIQUE;
                alias = "HeOb";
            } else {
                fontName = Standard14Fonts.FontName.HELVETICA;
                alias = "Helv";
            }
        }

        resources.put(COSName.getPDFName(alias), new PDType1Font(fontName));
        return alias;
    }

    private static String toRgbOperands(String hexColor) {
        try {
            String hex = hexColor == null ? "#000000" : hexColor.trim();
            if (hex.startsWith("#")) {
                hex = hex.substring(1);
            }
            if (hex.length() != 6) {
                return "0 0 0";
            }
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            float rf = r / 255f;
            float gf = g / 255f;
            float bf = b / 255f;
            return rf + " " + gf + " " + bf;
        } catch (Exception e) {
            log.debug("Invalid color '{}', using black", hexColor);
            return "0 0 0";
        }
    }

    private static int toQuadding(String align) {
        String normalized = align == null ? "left" : align.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "center" -> 1;
            case "right" -> 2;
            default -> 0;
        };
    }

    private static String transformText(String value, String transform) {
        if (value == null || transform == null) {
            return value;
        }
        return switch (transform.toLowerCase(Locale.ROOT)) {
            case "uppercase" -> value.toUpperCase(Locale.ROOT);
            case "lowercase" -> value.toLowerCase(Locale.ROOT);
            case "capitalize" -> {
                String[] words = value.split("\\s+");
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < words.length; i++) {
                    String w = words[i];
                    if (w.isEmpty()) {
                        continue;
                    }
                    sb.append(Character.toUpperCase(w.charAt(0)));
                    if (w.length() > 1) {
                        sb.append(w.substring(1).toLowerCase(Locale.ROOT));
                    }
                    if (i < words.length - 1) {
                        sb.append(' ');
                    }
                }
                yield sb.toString();
            }
            default -> value;
        };
    }

    private static boolean matchesSelectedField(PDTextField textField, Set<String> selected) {
        if (selected == null || selected.isEmpty()) {
            return false;
        }

        String fqName = trimToNull(textField.getFullyQualifiedName());
        String partialName = trimToNull(textField.getPartialName());

        return containsName(selected, fqName) || containsName(selected, partialName);
    }

    private static boolean containsName(Set<String> selected, String name) {
        if (name == null) {
            return false;
        }
        return selected.contains(name);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

}
