import {Controller, useForm} from "react-hook-form"
import * as z from "zod"
import {Button} from "./components/ui/button.tsx";
import {Checkbox} from "./components/ui/checkbox"
import {Input} from "./components/ui/input"
import {Label} from "./components/ui/label"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "./components/ui/card"
import React, {useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {DocxMinimize} from "./services/docx-minimize.ts";
import {Separator} from "@radix-ui/react-separator";
import {Github, Loader2, Star, TableOfContents} from "lucide-react";
import {Packer} from "docx";
import {saveAs} from "file-saver";
import {Alert, AlertDescription, AlertTitle} from "./components/ui/alert"
import {useToast} from "./hooks/use-toast.ts";

const formSchema = z.object({
    sectionsToRemove: z.array(z.string()),
    newFontSize: z.number().min(1).max(72).optional(),
})

type FormData = z.infer<typeof formSchema>

export default function App() {
    const [file, setFile] = useState<DocxMinimize | null>(null);
    const [sections, setSections] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast()

    const {control, handleSubmit} = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            sectionsToRemove: [],
            newFontSize: 14,
        },
    })

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            try {
                setIsUploading(true);
                const doc = new DocxMinimize(selectedFile);
                await doc.initialize()
                setFile(doc);
                setSections(doc.getHeadings());
            } catch (e) {

            } finally {
                setIsUploading(false);
            }
        } else {
            alert("Please upload a valid DOCX file.")
        }
    }

    const onSubmit = async (data: FormData) => {
        if (file) {
            const doc = file.download({
                fontSize: data.newFontSize,
                withOutSections: data.sectionsToRemove
            });
            Packer.toBlob(doc).then((blob) => {
                saveAs(blob, "example.docx");
            });
        }
    };

    const onCopy = async () => {
        if (file) {
            try {
                const sliced = file.slice(control._formValues.sectionsToRemove);
                await navigator.clipboard.writeText(sliced);
                toast({
                    title: "Copied!",
                    description: "The optimized content has been successfully copied to your clipboard",
                });
            } catch (err) {
                toast({
                    title: "Error!",
                    description: `Failed to copy text:\n${err}`,
                    variant: "destructive"
                });
            }
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto my-2">
            <CardHeader className="space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <p className="flex items-center gap-2">
                        <Star fill="#3576DF"/>
                        <span>
                            If the app was helpful to you, please support it with a star!
                        </span>
                    </p>
                    <a href="https://github.com/Wlad1slav/docx-page-minimizer" target="_blank" className="w-full sm:w-auto">
                        <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                            <Github/>
                            <span>Github</span>
                        </Button>
                    </a>
                </div>
                <Separator className="w-full"/>
                <CardTitle className="text-2xl">DOCX Page Optimizer</CardTitle>
                <CardDescription>
                    Removes unnecessary line breaks, spaces, images, and the sections you specify from a DOCX file.
                    Perfect for those looking to minimize the number of pages in a document while retaining only the
                    essential content.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    <div className="space-y-1">
                        <Label htmlFor="docx-file">Upload DOCX File</Label>
                        <Input id="docx-file" type="file" accept=".docx" onChange={onFileChange}/>
                    </div>
                    {isUploading && <Loader2 className="animate-spin"/>}
                    {file && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            <Alert variant="warn">
                                <AlertTitle className="flex items-center gap-2">
                                    <TableOfContents className="h-4 w-4"/>
                                    <span>Heads up!</span>
                                </AlertTitle>
                                <AlertDescription>
                                    The removal of the section containing the table of contents (зміст) is performed
                                    incorrectly. It should be manually removed before optimization through our
                                    algorithm.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Sections to <b>Remove</b></Label>
                                {sections.map((section) => (
                                    <div key={section} className="flex items-center space-x-2">
                                        <Controller
                                            name="sectionsToRemove"
                                            control={control}
                                            render={({field}) => (
                                                <Checkbox
                                                    variant="destructive"
                                                    checked={field.value.includes(section)}
                                                    onCheckedChange={(checked) => {
                                                        const updatedSections = checked
                                                            ? [...field.value, section]
                                                            : field.value.filter((s) => s !== section)
                                                        field.onChange(updatedSections)
                                                    }}
                                                />
                                            )}
                                        />
                                        <Label htmlFor={`section-${section}`}>{section}</Label>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1 pb-4">
                                <Label htmlFor="newFontSize">New Font Size (px)</Label>
                                <Controller
                                    name="newFontSize"
                                    control={control}
                                    render={({field}) => (
                                        <Input
                                            type="number"
                                            min="1"
                                            max="72"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                                        />
                                    )}
                                />
                            </div>

                            <Button type="submit" className="w-full">
                                Optimize DOCX
                            </Button>
                            <Button type="button" variant="outline" className="w-full" onClick={onCopy}>
                                Copy content
                            </Button>
                        </form>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
