// Keep the headset's asymmetric field of view while using this camera's clip planes.
export function setXRProjection(camera, projection) {
  const { near, far } = camera;
  camera.projectionMatrix.copy(projection);
  const e = camera.projectionMatrix.elements;
  e[10] = far === Infinity ? -1 : -(far + near) / (far - near);
  e[14] = far === Infinity ? -2 * near : -2 * far * near / (far - near);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

// Give world updates a standalone camera for the combined stereo frustum.
// Worlds access this as camera.viewCamera for visibility checks. The camera
// passed to update() retains the flight pose for authored motion and placement.
export function copyXRView(camera, combined) {
  combined.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrixWorld(true);
  camera.projectionMatrix.copy(combined.projectionMatrix);
  camera.projectionMatrixInverse.copy(combined.projectionMatrixInverse);
  const e = camera.projectionMatrix.elements;
  camera.near = e[14] / (e[10] - 1);
  camera.far = e[10] === -1 ? Infinity : e[14] / (e[10] + 1);
  camera.fov = 2 * Math.atan(1 / e[5]) * 180 / Math.PI;
  camera.aspect = e[5] / e[0];
  return camera;
}

// Nested render hooks restore camera.viewport. Offscreen eye buffers start at
// (0, 0), regardless of the eye's placement in the headset framebuffer.
export function copyXREyeView(camera, eye) {
  copyXRView(camera, eye);
  camera.layers.mask = eye.layers.mask;
  camera.viewport.set(0, 0, eye.viewport.z, eye.viewport.w);
  return camera;
}
