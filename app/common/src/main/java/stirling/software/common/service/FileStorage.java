package stirling.software.common.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * In-memory file store for async job handoff and file-id based API flows.
 *
 * <p>Intentionally avoids disk writes so uploaded content is ephemeral and tied to process
 * lifetime.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorage {

    public record StoredFile(String fileId, long size) {}

    private final Map<String, byte[]> store = new ConcurrentHashMap<>();

    private final FileOrUploadService fileOrUploadService;

    public String storeFile(MultipartFile file) throws IOException {
        String fileId = UUID.randomUUID().toString();
        store.put(fileId, file.getBytes());
        log.debug("Stored file with ID: {}", fileId);
        return fileId;
    }

    public String storeBytes(byte[] bytes, String originalName) {
        String fileId = UUID.randomUUID().toString();
        store.put(fileId, bytes);
        log.debug("Stored bytes with ID: {}", fileId);
        return fileId;
    }

    public MultipartFile retrieveFile(String fileId) throws IOException {
        byte[] data = store.get(fileId);
        if (data == null) throw new IOException("File not found: " + fileId);
        return fileOrUploadService.toMockMultipartFile(fileId, data);
    }

    public byte[] retrieveBytes(String fileId) throws IOException {
        byte[] data = store.get(fileId);
        if (data == null) throw new IOException("File not found: " + fileId);
        return data;
    }

    public boolean deleteFile(String fileId) {
        return store.remove(fileId) != null;
    }

    public boolean fileExists(String fileId) {
        return store.containsKey(fileId);
    }

    public long getFileSize(String fileId) throws IOException {
        byte[] data = store.get(fileId);
        if (data == null) throw new IOException("File not found: " + fileId);
        return data.length;
    }

    public StoredFile storeInputStream(InputStream in, String originalName) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        in.transferTo(buf);
        byte[] bytes = buf.toByteArray();
        String fileId = UUID.randomUUID().toString();
        store.put(fileId, bytes);
        log.debug("Stored stream as ID: {} ({} bytes)", fileId, bytes.length);
        return new StoredFile(fileId, bytes.length);
    }

    public InputStream retrieveInputStream(String fileId) throws IOException {
        byte[] data = store.get(fileId);
        if (data == null) throw new IOException("File not found: " + fileId);
        return new java.io.ByteArrayInputStream(data);
    }
}
