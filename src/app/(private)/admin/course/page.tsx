'use client'

import { use } from 'react'
import { SearchParams } from '@/types/query'
import { useCoursesAdminQuery } from '@/queries/useCourse'
import { CourseStats } from '@/components/private/admin/course/course-stats'
import { Button } from '@/components/ui/button'
import { LayoutList } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { TableCustom, dataListType } from '@/components/table-custom'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MoreOptions } from '@/components/private/common/more-options'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

function AdminCourse(props: { searchParams: SearchParams }) {
  const searchParams = use(props.searchParams)
  const router = useRouter()

  // Lấy giá trị từ searchParams hoặc sử dụng giá trị mặc định
  const currentKeyword = (searchParams.keyword as string) || ''
  const currentPageSize = Number(searchParams.page_size) || 10
  const currentPageIndex = Number(searchParams.page_index) || 1

  // Gọi API với giá trị từ URL
  const { data: responseData, isLoading } = useCoursesAdminQuery({
    keyword: currentKeyword,
    page_size: currentPageSize,
    page_index: currentPageIndex
  })

  const data = responseData?.payload.data || []
  const pagination = responseData?.payload.pagination || {
    pageSize: 0,
    totalItem: 0,
    currentPage: 0,
    totalPage: 0,
    maxPageSize: 0
  }

  // Tính toán thống kê
  const totalCourses = pagination.totalItem || 0
  const totalEnrollments = data.reduce((sum: number, course: any) => sum + (course.totalEnrollment || 0), 0)
  const averageRating =
    data.length > 0 ? data.reduce((sum: number, course: any) => sum + (course.aveRating || 0), 0) / data.length : 0
  const displayAverageRating = !isNaN(averageRating) ? Number(averageRating.toFixed(1)) : 0
  const bannedCourses = data.filter((course: any) => course.isBanned).length

  // Cấu hình cột cho bảng
  const headerColumn = [
    { id: 1, name: 'Tên khóa học' },
    { id: 2, name: 'Ngày tạo' },
    { id: 3, name: 'Người tạo' },
    { id: 4, name: 'Người duyệt' },
    { id: 5, name: 'Trạng thái' },
    { id: 6, name: '' }
  ]

  const handleReview = () => null

  const bodyColumn = useMemo(
    () => [
      {
        id: 1,
        render: (course: any) => (
          <div className='flex items-center gap-3 min-w-[300px] max-w-[400px]'>
            <div className='relative h-12 w-12 flex-shrink-0'>
              <Image
                src={course.imageUrl || '/placeholder-course.jpg'}
                alt={`Thumbnail for ${course.title || 'Course'}`}
                fill
                className='rounded-md object-cover'
                sizes='48px'
                priority={false}
              />
            </div>
            <div className='space-y-0.5 overflow-hidden'>
              <div className='font-medium truncate'>{course.title || 'Untitled Course'}</div>
              <div className='text-xs text-muted-foreground line-clamp-1'>{course.description || 'No description'}</div>
            </div>
          </div>
        )
      },
      {
        id: 2,
        render: (course: any) => {
          const date = course.createdAt ? new Date(course.createdAt) : new Date()
          return (
            <div className='min-w-[120px]'>
              <div className='text-sm'>{format(date, 'dd/MM/yyyy', { locale: vi })}</div>
              <div className='text-xs text-muted-foreground'>{format(date, 'HH:mm', { locale: vi })}</div>
            </div>
          )
        }
      },
      {
        id: 3,
        render: (course: any) => (
          <div className='min-w-[120px]'>
            <div className='text-sm'>{course.creator?.username || 'N/A'}</div>
          </div>
        )
      },
      {
        id: 4,
        render: (course: any) => (
          <div className='min-w-[120px]'>
            <div className='text-sm'>{course.censor?.username || 'Chưa được duyệt'}</div>
          </div>
        )
      },
      {
        id: 5,
        render: (course: any) => (
          <div className='flex items-center min-w-[100px]'>
            <Badge variant={course.isBanned ? 'destructive' : 'green'} className='w-fit'>
              {course.isBanned ? 'Đã khóa' : 'Hoạt động'}
            </Badge>
          </div>
        )
      },
      {
        id: 6,
        render: (course: any) => (
          <div className='flex justify-end min-w-[40px]'>
            <MoreOptions
              item={{
                id: course.id,
                title: course.title,
                status: course.isBanned ? 'Đã khóa' : 'Hoạt động',
                slug: course.slug
              }}
              itemType='course'
              onView={() => router.push(`/admin/course/${course.id}`)}
              onReview={() => handleReview}
            />
          </div>
        )
      }
    ],
    [router]
  )

  const tableData: dataListType = {
    data,
    message: '',
    pagination
  }

  return (
    <div className='container mx-auto px-4 py-6 space-y-6'>
      {/* Header */}
      <div>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold'>Quản lý khóa học</h1>
            <p className='text-muted-foreground mt-1'>Quản lý và theo dõi tất cả khóa học trong hệ thống</p>
          </div>
          <Link href='/admin/course/categories'>
            <Button variant='outline'>
              <LayoutList className='w-4 h-4 mr-2' />
              Quản lý danh mục
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <CourseStats
        isLoading={isLoading}
        totalCourses={totalCourses}
        totalEnrollments={totalEnrollments}
        averageRating={displayAverageRating}
        bannedCourses={bannedCourses}
      />

      {/* Table */}
      <TableCustom
        data={tableData}
        headerColumn={headerColumn}
        bodyColumn={bodyColumn}
        loading={isLoading}
        href='/admin/course'
        showSearch={true}
        searchParamName='keyword'
        searchPlaceholder='Tìm kiếm khoá học...'
      />
    </div>
  )
}

export default AdminCourse
