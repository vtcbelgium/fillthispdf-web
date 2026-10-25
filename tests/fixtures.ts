import {
  PDFDocument,
  PDFName,
  PDFNumber,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
export async function fixture({
  fields = false,
  rotations = [0, 90],
  crop = false,
  pages,
  userUnit = 1,
}: {
  fields?: boolean;
  rotations?: number[];
  crop?: boolean;
  pages?: number;
  userUnit?: number;
} = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [i, rotation] of (pages
    ? Array(pages).fill(0)
    : rotations
  ).entries()) {
    const page = doc.addPage([612, 792]);
    page.setRotation(degrees(rotation));
    page.node.set(PDFName.of("UserUnit"), PDFNumber.of(userUnit));
    if (crop) page.setCropBox(30, 45, 540, 700);
    page.drawText(`Original page ${i + 1}`, { x: 60, y: 720, size: 20, font });
    page.drawRectangle({
      x: 60,
      y: 580,
      width: 350,
      height: 50,
      borderWidth: 1,
      borderColor: rgb(0.4, 0.4, 0.4),
    });
  }
  if (fields) {
    const form = doc.getForm(),
      page = doc.getPage(0);
    const name = form.createTextField("Full name");
    name.setText("Original name");
    name.addToPage(page, { x: 60, y: 650, width: 260, height: 28 });
    const check = form.createCheckBox("I agree");
    check.addToPage(page, { x: 60, y: 540, width: 20, height: 20 });
    const drop = form.createDropdown("Country");
    drop.addOptions(["Belgium", "France"]);
    drop.select("Belgium");
    drop.addToPage(page, { x: 100, y: 530, width: 180, height: 30 });
    const radio = form.createRadioGroup("Contact");
    radio.addOptionToPage("Email", page, {
      x: 60,
      y: 480,
      width: 20,
      height: 20,
    });
    radio.addOptionToPage("Phone", page, {
      x: 100,
      y: 480,
      width: 20,
      height: 20,
    });
    const notes = form.createTextField("Notes");
    notes.enableMultiline();
    notes.addToPage(page, { x: 60, y: 350, width: 260, height: 80 });
    const fixed = form.createTextField("Reference");
    fixed.setText("ABC-123");
    fixed.enableReadOnly();
    fixed.addToPage(page, { x: 60, y: 300, width: 260, height: 25 });
  }
  return doc.save();
}
