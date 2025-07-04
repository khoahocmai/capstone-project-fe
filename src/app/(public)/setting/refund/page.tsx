'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Clock,
  Calendar,
  AlertTriangle,
  Wallet,
  RefreshCw,
  CheckCircle,
  Book,
  Package,
  Boxes,
  ArrowLeftRight
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useGetRefundOrders, useGetReturnOrdersQuery } from '@/queries/useOrder'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { RefundStatusValues, ReturnStatusValues } from '@/constants/type'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'

type RefundStatus = (typeof RefundStatusValues)[number]
type ReturnStatus = (typeof ReturnStatusValues)[number]

// Map trạng thái đơn hàng sang style và text
const statusColorMap: Record<RefundStatus, string> = {
  REFUND_REQUEST: 'bg-yellow-100 text-yellow-800',
  REFUNDING: 'bg-blue-100 text-blue-800',
  REFUNDED: 'bg-green-100 text-green-800',
  REFUND_FAILED: 'bg-red-100 text-red-800'
}

const statusTextMap: Record<RefundStatus, string> = {
  REFUND_REQUEST: 'Chờ xử lý',
  REFUNDING: 'Đang xử lý',
  REFUNDED: 'Hoàn thành',
  REFUND_FAILED: 'Thất bại'
}

const statusIconMap: Record<RefundStatus, React.ReactNode> = {
  REFUND_REQUEST: <Clock className='h-4 w-4' />,
  REFUNDING: <RefreshCw className='h-4 w-4' />,
  REFUNDED: <Wallet className='h-4 w-4' />,
  REFUND_FAILED: <AlertTriangle className='h-4 w-4' />
}

// Helper function to check if status is a refund status
const isRefundStatus = (status: string): status is RefundStatus => {
  return RefundStatusValues.includes(status as RefundStatus)
}

// Helper function to get status color
const getStatusColor = (status: string) => {
  return isRefundStatus(status) ? statusColorMap[status] : 'bg-gray-100 text-gray-800'
}

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  return isRefundStatus(status) ? statusIconMap[status] : <AlertTriangle className='h-4 w-4' />
}

// Helper function to get status text
const getStatusText = (status: string) => {
  return isRefundStatus(status) ? statusTextMap[status] : status
}

// Map trạng thái đơn đổi trả
const returnStatusColorMap: Record<ReturnStatus, string> = {
  EXCHANGE_REQUEST: 'bg-yellow-100 text-yellow-800',
  EXCHANGING: 'bg-blue-100 text-blue-800',
  EXCHANGED: 'bg-green-100 text-green-800',
  EXCHANGE_FAILED: 'bg-red-100 text-red-800'
}

const returnStatusTextMap: Record<ReturnStatus, string> = {
  EXCHANGE_REQUEST: 'Chờ xử lý',
  EXCHANGING: 'Đang xử lý',
  EXCHANGED: 'Hoàn thành',
  EXCHANGE_FAILED: 'Thất bại'
}

const returnStatusIconMap: Record<ReturnStatus, React.ReactNode> = {
  EXCHANGE_REQUEST: <Clock className='h-4 w-4' />,
  EXCHANGING: <ArrowLeftRight className='h-4 w-4' />,
  EXCHANGED: <CheckCircle className='h-4 w-4' />,
  EXCHANGE_FAILED: <AlertTriangle className='h-4 w-4' />
}

// Helper function to check if status is a return status
const isReturnStatus = (status: string): status is ReturnStatus => {
  return ReturnStatusValues.includes(status as ReturnStatus)
}

// Helper function to get return status color
const getReturnStatusColor = (status: string) => {
  return isReturnStatus(status) ? returnStatusColorMap[status] : 'bg-gray-100 text-gray-800'
}

// Helper function to get return status icon
const getReturnStatusIcon = (status: string) => {
  return isReturnStatus(status) ? returnStatusIconMap[status] : <AlertTriangle className='h-4 w-4' />
}

// Helper function to get return status text
const getReturnStatusText = (status: string) => {
  return isReturnStatus(status) ? returnStatusTextMap[status] : status
}

export default function RefundPage() {
  // Trạng thái cho tìm kiếm và lọc
  const [tabValue, setTabValue] = useState('refund')
  const [search, setSearch] = useState('')
  const [refundStatus, setRefundStatus] = useState('all')
  const [returnStatus, setReturnStatus] = useState('all')

  // Lấy dữ liệu từ API
  const {
    data: refundData,
    isLoading: isRefundLoading,
    error: refundError
  } = useGetRefundOrders({ page_size: 50, page_index: 1 })

  const {
    data: returnData,
    isLoading: isReturnLoading,
    error: returnError
  } = useGetReturnOrdersQuery({ page_size: 50, page_index: 1 })

  // Xử lý dữ liệu và lọc cho đơn hoàn tiền
  const filteredRefundOrders = useMemo(() => {
    if (!refundData?.payload?.data) return []

    let filteredData = [...refundData.payload.data]

    // Lọc theo từ khóa tìm kiếm
    if (search.trim()) {
      filteredData = filteredData.filter((order) => order.orderCode.toString().includes(search))
    }

    // Lọc theo trạng thái
    if (refundStatus !== 'all') {
      filteredData = filteredData.filter((order) => order.status === refundStatus)
    }

    return filteredData
  }, [refundData?.payload?.data, search, refundStatus])

  // Xử lý dữ liệu và lọc cho đơn đổi trả
  const filteredReturnOrders = useMemo(() => {
    if (!returnData?.payload?.data) return []

    let filteredData = [...returnData.payload.data]

    // Lọc theo từ khóa tìm kiếm
    if (search.trim()) {
      filteredData = filteredData.filter((order) => order.orderCode.toString().includes(search))
    }

    // Lọc theo trạng thái
    if (returnStatus !== 'all') {
      filteredData = filteredData.filter((order) => order.status === returnStatus)
    }

    return filteredData
  }, [returnData?.payload?.data, search, returnStatus])

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi })
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className='container max-w-7xl mx-auto py-6 space-y-8'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold'>Hoàn tiền & Đổi trả</h1>
        <p className='text-muted-foreground mt-1'>Quản lý yêu cầu hoàn tiền và đổi trả của bạn</p>
      </div>

      <Tabs value={tabValue} onValueChange={setTabValue} className='w-full'>
        <TabsList className='mb-6'>
          <TabsTrigger value='refund' className='flex-1'>
            Hoàn tiền
          </TabsTrigger>
          <TabsTrigger value='return' className='flex-1'>
            Đổi trả
          </TabsTrigger>
        </TabsList>

        <TabsContent value='refund' className='space-y-6'>
          {/* Filters - Refund */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Tìm kiếm theo mã đơn hàng...'
                className='pl-9'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={refundStatus} onValueChange={setRefundStatus}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder='Trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả trạng thái</SelectItem>
                <SelectItem value='REFUND_REQUEST'>Chờ xử lý</SelectItem>
                <SelectItem value='REFUNDING'>Đang xử lý</SelectItem>
                <SelectItem value='REFUNDED'>Hoàn thành</SelectItem>
                <SelectItem value='REFUND_FAILED'>Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refund Orders List */}
          <div className='space-y-4'>
            {isRefundLoading ? (
              // Skeleton loader khi đang tải
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className='overflow-hidden'>
                  <CardContent className='p-6'>
                    <div className='flex flex-col gap-6'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-2'>
                          <Skeleton className='h-5 w-40' />
                          <Skeleton className='h-4 w-64' />
                        </div>
                        <Skeleton className='h-10 w-10 rounded-full' />
                      </div>
                      <Separator />
                      <div className='space-y-3'>
                        <Skeleton className='h-4 w-32' />
                        <div className='flex gap-4 p-4 rounded-lg bg-muted/30'>
                          <Skeleton className='w-16 h-16 rounded-lg' />
                          <div className='flex-1'>
                            <Skeleton className='h-4 w-24 mb-2' />
                            <Skeleton className='h-5 w-48 mb-2' />
                            <Skeleton className='h-4 w-16' />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className='flex items-center justify-between'>
                        <Skeleton className='h-4 w-56' />
                        <Skeleton className='h-6 w-24' />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : refundError ? (
              // Hiển thị lỗi nếu có
              <div className='text-center py-14 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-dashed border-gray-200'>
                <div className='flex flex-col items-center'>
                  <AlertTriangle className='h-12 w-12 text-red-400 mb-3' />
                  <h3 className='text-lg font-medium text-gray-800 mb-2'>Có lỗi xảy ra</h3>
                  <p className='text-sm text-gray-500 max-w-md'>
                    Không thể tải dữ liệu hoàn tiền. Vui lòng thử lại sau.
                  </p>
                  <Button variant='outline' className='mt-4' onClick={() => window.location.reload()}>
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Tải lại
                  </Button>
                </div>
              </div>
            ) : filteredRefundOrders.length === 0 ? (
              // Hiển thị trạng thái không có dữ liệu
              <div className='text-center py-14 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-dashed border-gray-200'>
                <div className='flex flex-col items-center'>
                  {search ? (
                    <>
                      <Search className='h-12 w-12 text-gray-300 mb-3' />
                      <h3 className='text-lg font-medium text-gray-800 mb-2'>Không tìm thấy kết quả</h3>
                      <p className='text-sm text-gray-500 max-w-md'>
                        Không tìm thấy yêu cầu hoàn tiền nào phù hợp với từ khóa &quot;{search}&quot;.
                      </p>
                    </>
                  ) : (
                    <>
                      <Wallet className='h-12 w-12 text-gray-300 mb-3' />
                      <h3 className='text-lg font-medium text-gray-800 mb-2'>Chưa có yêu cầu hoàn tiền</h3>
                      <p className='text-sm text-gray-500 max-w-md'>Bạn chưa có yêu cầu hoàn tiền nào.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Hiển thị danh sách hoàn tiền
              filteredRefundOrders.map((order) => (
                <Card key={order.id} className='overflow-hidden border hover:border-primary/40 transition-colors'>
                  <CardContent className='p-6'>
                    <div className='flex flex-col gap-6'>
                      {/* Header */}
                      <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <h3 className='font-medium'>Đơn hàng #{order.orderCode}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              <span className='flex items-center gap-1'>
                                {getStatusIcon(order.status)}
                                <span>{getStatusText(order.status)}</span>
                              </span>
                            </Badge>
                          </div>
                          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                            <div className='flex items-center gap-1'>
                              <Calendar className='h-4 w-4' />
                              <span>Ngày đặt: {formatDate(order.orderDate)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Clock className='h-4 w-4' />
                              <span>Yêu cầu hoàn tiền: {formatDate(order.refundRequestDate)}</span>
                            </div>
                            {order.refundProcessedDate && (
                              <div className='flex items-center gap-1'>
                                <CheckCircle className='h-4 w-4' />
                                <span>Xử lý: {formatDate(order.refundProcessedDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Thông tin sản phẩm hoàn tiền */}
                      {order.orderDetails && order.orderDetails.length > 0 && (
                        <div className='space-y-3'>
                          <div className='text-sm font-medium'>Sản phẩm yêu cầu hoàn tiền</div>
                          <div className='space-y-3'>
                            {order.orderDetails.map((item) => (
                              <div
                                key={item.id}
                                className='p-3 bg-muted/20 rounded-lg border border-muted flex items-center gap-3'
                              >
                                <div className='flex-1'>
                                  {item.courseId ? (
                                    <div className='flex items-center gap-1'>
                                      <Book className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Khóa học</span>
                                    </div>
                                  ) : item.productId ? (
                                    <div className='flex items-center gap-1'>
                                      <Package className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Sản phẩm</span>
                                    </div>
                                  ) : item.comboId ? (
                                    <div className='flex items-center gap-1'>
                                      <Boxes className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Combo</span>
                                    </div>
                                  ) : null}
                                  <div className='mt-1 text-sm text-muted-foreground'>
                                    Số lượng: {item.quantity} | Giá: {formatPrice(item.totalPrice)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Thông tin yêu cầu */}
                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          {/* Chỉ hiển thị thông tin người nhận khi có ít nhất một sản phẩm vật lý */}
                          {order.orderDetails && order.orderDetails.some((item) => item.productId) && (
                            <div>
                              <div className='text-sm font-medium text-muted-foreground mb-1'>Thông tin nhận hàng</div>
                              <p className='font-medium text-slate-800'>{order.delivery?.name || 'N/A'}</p>
                              {order.delivery?.phone && (
                                <p className='text-sm text-slate-600 mt-1'>{order.delivery.phone}</p>
                              )}
                              {order.delivery?.address && (
                                <p className='text-sm text-slate-600 mt-1 line-clamp-2'>{order.delivery.address}</p>
                              )}
                            </div>
                          )}
                          <div>
                            <div className='text-sm font-medium text-muted-foreground mb-1'>Thông tin thanh toán</div>
                            <p className='font-medium text-slate-800'>
                              {order.payment?.payMethod === 'COD'
                                ? 'Thanh toán khi nhận hàng'
                                : 'Chuyển khoản ngân hàng'}
                            </p>
                            {order.payment?.payDate && (
                              <p className='text-sm text-slate-600 mt-1'>
                                Ngày thanh toán: {formatDate(order.payment.payDate)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className='text-sm font-medium text-muted-foreground mb-1'>Lý do hoàn tiền</div>
                          <div className='p-3 bg-muted/40 rounded-md border border-muted'>
                            <p className='text-slate-700'>{order.refundReason || 'Không có lý do'}</p>
                          </div>
                        </div>

                        {order.refundNote && (
                          <div>
                            <div className='text-sm font-medium text-muted-foreground mb-1'>Ghi chú từ cửa hàng</div>
                            <div className='p-3 bg-primary/5 rounded-md border border-primary/20'>
                              <p className='text-slate-700'>{order.refundNote}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Footer */}
                      <div className='flex items-center justify-between'>
                        <div>
                          <div className='text-sm text-muted-foreground mb-1'>Trạng thái</div>
                          <div className='flex items-center gap-1.5'>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                order.status === 'REFUNDED'
                                  ? 'bg-green-500'
                                  : order.status === 'REFUNDING'
                                    ? 'bg-blue-500'
                                    : 'bg-yellow-500'
                              }`}
                            />
                            <span className='font-medium'>{getStatusText(order.status)}</span>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm text-muted-foreground mb-1'>Số tiền hoàn trả</div>
                          <div className='text-lg font-bold text-primary'>{formatPrice(order.totalAmount || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value='return' className='space-y-6'>
          {/* Filters - Return */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Tìm kiếm theo mã đơn hàng...'
                className='pl-9'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={returnStatus} onValueChange={setReturnStatus}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder='Trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả trạng thái</SelectItem>
                <SelectItem value='EXCHANGE_REQUEST'>Chờ xử lý</SelectItem>
                <SelectItem value='EXCHANGING'>Đang xử lý</SelectItem>
                <SelectItem value='EXCHANGED'>Hoàn thành</SelectItem>
                <SelectItem value='EXCHANGE_FAILED'>Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Return Orders List */}
          <div className='space-y-4'>
            {isReturnLoading ? (
              // Skeleton loader khi đang tải
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className='overflow-hidden'>
                  <CardContent className='p-6'>
                    <div className='flex flex-col gap-6'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-2'>
                          <Skeleton className='h-5 w-40' />
                          <Skeleton className='h-4 w-64' />
                        </div>
                        <Skeleton className='h-10 w-10 rounded-full' />
                      </div>
                      <Separator />
                      <div className='space-y-3'>
                        <Skeleton className='h-4 w-32' />
                        <div className='flex gap-4 p-4 rounded-lg bg-muted/30'>
                          <Skeleton className='w-16 h-16 rounded-lg' />
                          <div className='flex-1'>
                            <Skeleton className='h-4 w-24 mb-2' />
                            <Skeleton className='h-5 w-48 mb-2' />
                            <Skeleton className='h-4 w-16' />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className='flex items-center justify-between'>
                        <Skeleton className='h-4 w-56' />
                        <Skeleton className='h-6 w-24' />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : returnError ? (
              // Hiển thị lỗi nếu có
              <div className='text-center py-14 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-dashed border-gray-200'>
                <div className='flex flex-col items-center'>
                  <AlertTriangle className='h-12 w-12 text-red-400 mb-3' />
                  <h3 className='text-lg font-medium text-gray-800 mb-2'>Có lỗi xảy ra</h3>
                  <p className='text-sm text-gray-500 max-w-md'>Không thể tải dữ liệu đổi trả. Vui lòng thử lại sau.</p>
                  <Button variant='outline' className='mt-4' onClick={() => window.location.reload()}>
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Tải lại
                  </Button>
                </div>
              </div>
            ) : filteredReturnOrders.length === 0 ? (
              // Hiển thị trạng thái không có dữ liệu
              <div className='text-center py-14 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-dashed border-gray-200'>
                <div className='flex flex-col items-center'>
                  {search ? (
                    <>
                      <Search className='h-12 w-12 text-gray-300 mb-3' />
                      <h3 className='text-lg font-medium text-gray-800 mb-2'>Không tìm thấy kết quả</h3>
                      <p className='text-sm text-gray-500 max-w-md'>
                        Không tìm thấy yêu cầu đổi trả nào phù hợp với từ khóa &quot;{search}&quot;.
                      </p>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className='h-12 w-12 text-gray-300 mb-3' />
                      <h3 className='text-lg font-medium text-gray-800 mb-2'>Chưa có yêu cầu đổi trả</h3>
                      <p className='text-sm text-gray-500 max-w-md'>Bạn chưa có yêu cầu đổi trả sản phẩm nào.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Hiển thị danh sách đổi trả
              filteredReturnOrders.map((order) => (
                <Card key={order.id} className='overflow-hidden border hover:border-primary/40 transition-colors'>
                  <CardContent className='p-6'>
                    <div className='flex flex-col gap-6'>
                      {/* Header */}
                      <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <h3 className='font-medium'>Đơn hàng #{order.orderCode}</h3>
                            <Badge className={getReturnStatusColor(order.status)}>
                              <span className='flex items-center gap-1'>
                                {getReturnStatusIcon(order.status)}
                                <span>{getReturnStatusText(order.status)}</span>
                              </span>
                            </Badge>
                          </div>
                          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                            <div className='flex items-center gap-1'>
                              <Calendar className='h-4 w-4' />
                              <span>Ngày đặt: {formatDate(order.orderDate)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Clock className='h-4 w-4' />
                              <span>Yêu cầu đổi trả: {formatDate(order.exchangeRequestDate)}</span>
                            </div>
                            {order.exchangeProcessedDate && (
                              <div className='flex items-center gap-1'>
                                <CheckCircle className='h-4 w-4' />
                                <span>Xử lý: {formatDate(order.exchangeProcessedDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Thông tin sản phẩm đổi trả */}
                      {order.orderDetails && order.orderDetails.length > 0 && (
                        <div className='space-y-3'>
                          <div className='text-sm font-medium'>Sản phẩm yêu cầu đổi trả</div>
                          <div className='space-y-3'>
                            {order.orderDetails.map((item: any) => (
                              <div
                                key={item.id}
                                className='p-3 bg-muted/20 rounded-lg border border-muted flex items-center gap-3'
                              >
                                <div className='flex-1'>
                                  {item.courseId ? (
                                    <div className='flex items-center gap-1'>
                                      <Book className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Khóa học</span>
                                    </div>
                                  ) : item.productId ? (
                                    <div className='flex items-center gap-1'>
                                      <Package className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Sản phẩm</span>
                                    </div>
                                  ) : item.comboId ? (
                                    <div className='flex items-center gap-1'>
                                      <Boxes className='h-4 w-4 text-primary' />
                                      <span className='font-medium'>Combo</span>
                                    </div>
                                  ) : null}
                                  <div className='mt-1 text-sm text-muted-foreground'>
                                    Số lượng: {item.quantity} | Giá: {formatPrice(item.totalPrice)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hình ảnh đổi trả */}
                      {order.returnRequestImages && order.returnRequestImages.length > 0 && (
                        <div className='space-y-3'>
                          <div className='text-sm font-medium'>Hình ảnh đính kèm</div>
                          <div className='flex flex-wrap gap-2'>
                            {order.returnRequestImages.map((imageUrl: string, index: number) => (
                              <div key={index} className='relative w-16 h-16 rounded overflow-hidden'>
                                <Image src={imageUrl} alt={`Hình ảnh ${index + 1}`} fill className='object-cover' />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Thông tin yêu cầu */}
                      <div className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          {/* Chỉ hiển thị thông tin người nhận khi có ít nhất một sản phẩm vật lý */}
                          {order.orderDetails && order.orderDetails.some((item: any) => item.productId) && (
                            <div>
                              <div className='text-sm font-medium text-muted-foreground mb-1'>Thông tin nhận hàng</div>
                              <p className='font-medium text-slate-800'>{order.delivery?.name || 'N/A'}</p>
                              {order.delivery?.phone && (
                                <p className='text-sm text-slate-600 mt-1'>{order.delivery.phone}</p>
                              )}
                              {order.delivery?.address && (
                                <p className='text-sm text-slate-600 mt-1 line-clamp-2'>{order.delivery.address}</p>
                              )}
                            </div>
                          )}
                          <div>
                            <div className='text-sm font-medium text-muted-foreground mb-1'>Thông tin thanh toán</div>
                            <p className='font-medium text-slate-800'>
                              {order.payment?.payMethod === 'COD'
                                ? 'Thanh toán khi nhận hàng'
                                : 'Chuyển khoản ngân hàng'}
                            </p>
                            {order.payment?.payDate && (
                              <p className='text-sm text-slate-600 mt-1'>
                                Ngày thanh toán: {formatDate(order.payment.payDate)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className='text-sm font-medium text-muted-foreground mb-1'>Lý do đổi trả</div>
                          <div className='p-3 bg-muted/40 rounded-md border border-muted'>
                            <p className='text-slate-700'>{order.exchangeReason || 'Không có lý do'}</p>
                          </div>
                        </div>

                        {order.exchangeNote && (
                          <div>
                            <div className='text-sm font-medium text-muted-foreground mb-1'>Ghi chú từ cửa hàng</div>
                            <div className='p-3 bg-primary/5 rounded-md border border-primary/20'>
                              <p className='text-slate-700'>{order.exchangeNote}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Footer */}
                      <div className='flex items-center justify-between'>
                        <div>
                          <div className='text-sm text-muted-foreground mb-1'>Trạng thái</div>
                          <div className='flex items-center gap-1.5'>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                order.status === 'RETURNED'
                                  ? 'bg-green-500'
                                  : order.status === 'RETURNING'
                                    ? 'bg-blue-500'
                                    : 'bg-yellow-500'
                              }`}
                            />
                            <span className='font-medium'>{getReturnStatusText(order.status)}</span>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm text-muted-foreground mb-1'>Tổng giá trị</div>
                          <div className='text-lg font-bold text-primary'>{formatPrice(order.totalAmount || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
