'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ChevronRight, Loader2, Save, Upload, Video, FileText } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRef, useState, use } from 'react'
import { useUploadVideoMutation } from '@/queries/useUpload'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { handleErrorApi } from '@/lib/utils'
import RichTextEditor from '@/components/rich-text-editor'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCreateLessonMutation } from '@/queries/useCourse'
import { TypeResourceValues } from '@/constants/type'
import { CreateLessonBodyType } from '@/schemaValidations/course.schema'

// Form validation schema
const formSchema = z.object({
  title: z.string().min(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' }),
  description: z.string().min(10, { message: 'Mô tả phải có ít nhất 10 ký tự' }),
  type: z.enum(TypeResourceValues, {
    required_error: 'Vui lòng chọn kiểu bài học'
  }),
  content: z.string().min(50, { message: 'Nội dung phải có ít nhất 50 ký tự' }).optional().nullable(),
  videoUrl: z.string().url({ message: 'URL video không hợp lệ' }).optional().nullable(),
  durations: z.number().min(0, { message: 'Thời lượng không được âm' })
})

type FormValues = z.infer<typeof formSchema>

export default function NewLessonPage(props: { params: Promise<{ id: string; chapterId: string }> }) {
  const params = use(props.params)
  const router = useRouter()

  const createLessonMutation = useCreateLessonMutation()
  const uploadVideoMutation = useUploadVideoMutation()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Setup form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'DOCUMENT',
      content: '',
      videoUrl: null,
      durations: 0
    }
  })

  // Watch type to conditionally render form fields
  const lessonType = form.watch('type')

  // Video preview component
  const VideoPreview = ({ src, className }: { src: string | null; className?: string }) => {
    if (!src) return null

    return (
      <div className={cn('aspect-video w-full max-w-[500px] rounded-md overflow-hidden bg-muted', className)}>
        <video className='w-full h-full object-cover' src={src} controls preload='metadata'>
          <track kind='captions' />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // Handle file upload for video
  const handleVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (limit to 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'Lỗi tải video',
          description: 'Kích thước video không được vượt quá 100MB',
          variant: 'destructive'
        })
        return
      }

      // Check file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Lỗi tải video',
          description: 'Vui lòng chọn file video hợp lệ',
          variant: 'destructive'
        })
        return
      }

      setVideoFile(file)
      const videoUrl = URL.createObjectURL(file)
      setVideoPreview(videoUrl)

      // Show file info
      toast({
        title: 'Đã chọn video',
        description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
      })
    }
  }

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)

      let finalVideoUrl: string | null = values.videoUrl || null

      // Upload video if present
      if (videoFile && (values.type === 'VIDEO' || values.type === 'BOTH')) {
        const formData = new FormData()
        formData.append('videos', videoFile)

        // Show upload progress toast
        toast({
          title: 'Đang tải video lên S3',
          description: `${videoFile.name} - Đang xử lý... Vui lòng đợi trong giây lát`,
          duration: 5000
        })

        try {
          // Upload video to S3
          const uploadResult = await uploadVideoMutation.mutateAsync(formData)

          if (!uploadResult?.payload?.data) {
            throw new Error('Không nhận được URL video từ server')
          }

          // Extract video URL from response
          finalVideoUrl = Array.isArray(uploadResult.payload.data)
            ? uploadResult.payload.data[0]
            : uploadResult.payload.data

          // Show success toast
          toast({
            title: 'Tải video thành công',
            description: 'Video đã được tải lên S3 thành công',
            duration: 3000,
            variant: 'default'
          })
        } catch (uploadError) {
          // Handle upload error
          handleErrorApi({
            error: uploadError,
            setError: form.setError
          })

          // Show more specific error message
          toast({
            title: 'Lỗi tải video',
            description: 'Không thể tải video lên S3. Vui lòng thử lại.',
            variant: 'destructive'
          })

          throw uploadError // Rethrow to stop the form submission
        }
      }

      // Prepare final values based on lesson type
      let finalContent: string | null = null

      // Set content based on lesson type
      if (values.type === 'DOCUMENT' || values.type === 'BOTH') {
        finalContent = values.content || ''
      }

      // Set video URL based on lesson type
      if (values.type === 'DOCUMENT') {
        finalVideoUrl = null
      }

      // Prepare submission data with required fields
      const submissionData: CreateLessonBodyType = {
        chapterId: params.chapterId,
        title: values.title,
        description: values.description,
        type: values.type,
        content: finalContent,
        videoUrl: finalVideoUrl,
        durations: values.durations
      }
      console.log(submissionData)
      // Create the lesson
      await createLessonMutation.mutateAsync(submissionData)

      // Show success toast
      toast({
        title: 'Tạo bài học thành công',
        description: 'Bài học đã được thêm vào chương học',
        variant: 'default'
      })

      // Redirect to chapter detail
      router.push(`/content-creator/course/${params.id}/chapter/${params.chapterId}`)
    } catch (error) {
      // Handle general error
      handleErrorApi({
        error,
        setError: form.setError
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = uploadVideoMutation.isPending || createLessonMutation.isPending || isSubmitting

  return (
    <div className='container max-w-4xl mx-auto px-4 py-6'>
      {/* Breadcrumb */}
      <nav className='flex items-center space-x-1 text-sm text-muted-foreground mb-6'>
        <Link href='/content-creator/course' className='hover:text-primary transition-colors'>
          Khóa học
        </Link>
        <ChevronRight className='h-4 w-4' />
        <Link href={`/content-creator/course/${params.id}`} className='hover:text-primary transition-colors'>
          Chi tiết khóa học
        </Link>
        <ChevronRight className='h-4 w-4' />
        <Link
          href={`/content-creator/course/${params.id}/chapter/${params.chapterId}`}
          className='hover:text-primary transition-colors'
        >
          Chi tiết chương
        </Link>
        <ChevronRight className='h-4 w-4' />
        <span className='font-medium text-foreground'>Tạo bài học mới</span>
      </nav>

      {/* Header */}
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>Thêm bài học mới</h1>
          <p className='text-sm text-muted-foreground mt-1'>Tạo nội dung bài học mới cho chương học</p>
        </div>
        <div className='flex items-center gap-4'>
          <Button variant='outline' asChild>
            <Link href={`/content-creator/course/${params.id}/chapter/${params.chapterId}`}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Quay lại
            </Link>
          </Button>
          <Button type='submit' disabled={isLoading} onClick={form.handleSubmit(onSubmit)}>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className='mr-2 h-4 w-4' />
                Lưu bài học
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          {/* Main Content */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin bài học</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Lesson Type Field */}
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại bài học</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Chọn loại bài học' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='DOCUMENT'>
                          <div className='flex items-center'>
                            <FileText className='w-4 h-4 mr-2 text-green-500' />
                            Bài đọc
                          </div>
                        </SelectItem>
                        <SelectItem value='VIDEO'>
                          <div className='flex items-center'>
                            <Video className='w-4 h-4 mr-2 text-blue-500' />
                            Video
                          </div>
                        </SelectItem>
                        <SelectItem value='BOTH'>
                          <div className='flex items-center'>
                            <FileText className='w-4 h-4 mr-2 text-purple-500' />
                            Video & Bài đọc
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title Field */}
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input placeholder='Nhập tiêu đề bài học' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả ngắn</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Nhập mô tả ngắn về bài học' className='min-h-24' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration Field */}
              <FormField
                control={form.control}
                name='durations'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời lượng (giây)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Nhập thời lượng bài học'
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Video Content Card */}
          <Card className={cn({ 'opacity-60': lessonType === 'DOCUMENT' })}>
            <CardHeader className='flex flex-row items-center'>
              <div className='flex items-center gap-2'>
                <Video className='h-5 w-5 text-blue-500' />
                <CardTitle>Nội dung Video</CardTitle>
              </div>
              {lessonType === 'DOCUMENT' && (
                <div className='ml-auto text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded'>
                  Không khả dụng
                </div>
              )}
            </CardHeader>

            <CardContent className='space-y-6'>
              {/* Video upload section */}
              <div className='flex flex-col gap-4'>
                {videoPreview && (
                  <div className='flex flex-col gap-2'>
                    <h3 className='text-sm font-medium'>Xem trước video</h3>
                    <VideoPreview src={videoPreview} />
                  </div>
                )}

                <div className='flex flex-col gap-2'>
                  <FormLabel>Tải lên video</FormLabel>
                  <div className='flex flex-col sm:flex-row gap-4 items-start'>
                    <div className='flex flex-col gap-2 w-full sm:w-auto'>
                      <Input
                        className='hidden'
                        type='file'
                        accept='video/*'
                        ref={videoInputRef}
                        onChange={handleVideoChange}
                        disabled={lessonType === 'DOCUMENT'}
                      />
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => videoInputRef.current?.click()}
                        disabled={lessonType === 'DOCUMENT'}
                        className='flex gap-2 items-center w-full sm:w-auto'
                      >
                        <Upload className='h-4 w-4' />
                        Tải video lên
                      </Button>
                      <p className='text-xs text-muted-foreground'>Hỗ trợ MP4, WebM, Ogg. Kích thước tối đa 100MB.</p>
                    </div>

                    {videoFile && (
                      <div className='flex items-center gap-2 border rounded-md p-2 flex-1'>
                        <Video className='w-10 h-10 text-primary shrink-0' />
                        <div className='text-sm overflow-hidden'>
                          <p className='font-medium text-primary truncate'>{videoFile.name}</p>
                          <p className='text-muted-foreground'>{(videoFile.size / (1024 * 1024)).toFixed(2)}MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Text Content Card */}
          <Card className={cn({ 'opacity-60': lessonType === 'VIDEO' })}>
            <CardHeader className='flex flex-row items-center'>
              <div className='flex items-center gap-2'>
                <FileText className='h-5 w-5 text-green-500' />
                <CardTitle>Nội dung Bài đọc</CardTitle>
              </div>
              {lessonType === 'VIDEO' && (
                <div className='ml-auto text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded'>
                  Không khả dụng
                </div>
              )}
            </CardHeader>

            <CardContent>
              {/* Content Field */}
              <FormField
                control={form.control}
                name='content'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor
                        content={field.value || ''}
                        onChange={(value) => field.onChange(lessonType === 'VIDEO' ? '' : value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
