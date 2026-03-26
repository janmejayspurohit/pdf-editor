import React from 'react';
import { StirlingFileStub } from '@app/types/fileContext';

interface FileEditorFileNameProps {
  file: StirlingFileStub;
}

const FileEditorFileName = ({ file }: FileEditorFileNameProps) => (
  <>{file.name}</>
);

export default FileEditorFileName;
