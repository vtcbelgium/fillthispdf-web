All fixtures are synthetic and contain no personal documents. `tests/fixtures.ts` creates the flat, rotated, cropped and AcroForm fixtures in memory with pdf-lib.

`password.pdf` is a single blank US Letter page encrypted with the test-only password `test-only`. It was generated with pypdf 6.21.2:

```python
from pypdf import PdfWriter
writer = PdfWriter()
writer.add_blank_page(width=612, height=792)
writer.encrypt('test-only')
writer.write('tests/fixtures/password.pdf')
```

Python is not required to run the tests.
