export type DeviceLocation = { latitude:number; longitude:number; accuracy:number }
// Called only from an explicit location action. Callers disclose any place lookup;
// device coordinates are not persisted or included in published posts.
export function requestDeviceLocation():Promise<DeviceLocation> {
 return new Promise((resolve,reject)=>{
  if(!window.isSecureContext){reject(new Error('定位需要 HTTPS 或本机预览环境。'));return}
  if(!navigator.geolocation){reject(new Error('当前浏览器不支持定位，请手动选择或填写地点。'));return}
  navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e.code===1?'未获得定位许可，请在浏览器设置中允许后重试。':e.code===3?'定位超时，请重试。':'暂时无法获取位置，请检查设备定位服务。')),{enableHighAccuracy:true,timeout:10000,maximumAge:0})
 })
}

