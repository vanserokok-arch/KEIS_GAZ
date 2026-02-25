import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { moneyToWordsRu } from "../../shared/utils/money-words";

interface ContractTemplateInput {
  fio: string;
  contractNumber: string;
  amount?: number;
  date: string;
  title: string;
}

export async function renderSimpleDocx(input: ContractTemplateInput): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: input.title, bold: true, size: 28 })]
          }),
          new Paragraph({ text: `Номер: ${input.contractNumber}` }),
          new Paragraph({ text: `Дата: ${input.date}` }),
          new Paragraph({ text: `Клиент: ${input.fio}` }),
          new Paragraph({ text: `Сумма: ${input.amount ?? 0} (${moneyToWordsRu(input.amount ?? 0)})` }),
          new Paragraph({
            children: [new TextRun("Документ сформирован в KEIS Contract System MVP.")]
          })
        ]
      }
    ]
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
