import mammoth from "mammoth";
import {Document, Paragraph, TextRun} from "docx";

export class DocxMinimize {
    private content: string = '';
    private htmlContent: string = '';

    constructor(private readonly doc: File) {
    }

    public async initialize(): Promise<void> {
        await this.extractTextFromDocx();
        await this.extractHtmlFromDocx();
    }

    private async extractTextFromDocx(): Promise<void> {
        try {
            const arrayBuffer = await this.doc.arrayBuffer();

            // Convert to text
            const result = await mammoth.extractRawText({arrayBuffer});
            this.content = result.value.replace(/\n/g, " ")
                .replace(/—/g, '-')
                .replace(/\s+/g, ' ')
                .trim();
        } catch (error) {
            console.error("Error extracting text from docx:", error);
            throw error;
        }
    }

    private async extractHtmlFromDocx(): Promise<void> {
        try {
            const arrayBuffer = await this.doc.arrayBuffer();

            // Convert to HTML
            const result = await mammoth.convertToHtml({arrayBuffer});
            this.htmlContent = result.value;
        } catch (error) {
            console.error("Error extracting HTML from docx:", error);
            throw error;
        }
    }

    /**
     * The method parses the HTML content and returns all headers from the document
     */
    public getHeadings(): string[] {
        // Creates an HTML parsing element
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.htmlContent, "text/html");

        // Gets all headings
        const headingElements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");

        // Converts a NodeList to an array with header text
        const headings: string[] = [];
        headingElements.forEach((heading) => {
            headings.push(heading.textContent || "");
        });

        return headings;
    }

    /**
     * Cuts all specified sections
     */
    public slice(sections: string[]): string {
        let result = this.content;
        const allSections = this.getHeadings();

        sections.forEach((sectionToDelete) => {
            const startToDelete = result.indexOf(sectionToDelete);
            if (startToDelete !== -1) {
                // Finds the index of the next header
                const nextSectionIndex = allSections.indexOf(sectionToDelete) + 1;
                const endToDelete = nextSectionIndex < allSections.length
                    ? result.indexOf(allSections[nextSectionIndex])
                    : result.length;

                if (endToDelete !== -1) {
                    // Cuts the text between the beginning and the end
                    result = result.slice(0, startToDelete) + result.slice(endToDelete);
                }
            }
        });

        return result;
    }

    /**
     * Download optimized file
     */
    public download({withOutSections, fontSize = 14}: {
        withOutSections?: string[];
        fontSize?: number;
    }): Document {
        let toDownload = withOutSections ? this.slice(withOutSections) : this.content;
        return new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: toDownload,
                                    size: fontSize * 2
                                }),
                            ],
                        }),
                    ],
                },
            ],
        });
    }
}
