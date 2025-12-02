pipeline {
  agent any

  environment {
    BACKEND_IMAGE = 'chatapp-backend:latest'
    FRONTEND_IMAGE = 'chatapp-frontend:latest'
    K8S_MANIFEST_DIR = 'k8s'
    // REGISTRY_MODE: 'none' | 'registry' | 'kind'
    REGISTRY_MODE = 'none'
    REGISTRY_URL = 'localhost:5000'
    KIND_CLUSTER_NAME = 'kind'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Backend Image') {
      steps {
        dir('.') {
          sh 'docker build -t ${BACKEND_IMAGE} -f backend/Dockerfile .'
        }
      }
    }

    stage('Build Frontend Image') {
      steps {
        dir('.') {
          sh 'docker build -t ${FRONTEND_IMAGE} -f frontend/Dockerfile frontend'
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        script {
          // Assumes Jenkins agent has kubectl configured and has access to the target cluster
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/pv-pvc.yaml || true'
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/mongo-deployment.yaml || true'
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/backend-deployment.yaml || true'
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/backend-service.yaml || true'
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/frontend-deployment.yaml || true'
          sh 'kubectl apply -f ${K8S_MANIFEST_DIR}/frontend-service.yaml || true'

          // Push or load images depending on REGISTRY_MODE
          if (env.REGISTRY_MODE == 'registry') {
            echo "Pushing images to registry ${env.REGISTRY_URL}"
            sh "docker tag ${BACKEND_IMAGE} ${REGISTRY_URL}/${BACKEND_IMAGE}"
            sh "docker tag ${FRONTEND_IMAGE} ${REGISTRY_URL}/${FRONTEND_IMAGE}"
            sh "docker push ${REGISTRY_URL}/${BACKEND_IMAGE}"
            sh "docker push ${REGISTRY_URL}/${FRONTEND_IMAGE}"
            sh "kubectl set image deployment/backend backend=${REGISTRY_URL}/${BACKEND_IMAGE} --record || true"
            sh "kubectl set image deployment/frontend frontend=${REGISTRY_URL}/${FRONTEND_IMAGE} --record || true"
          } else if (env.REGISTRY_MODE == 'kind') {
            echo "Loading images into kind cluster ${env.KIND_CLUSTER_NAME}"
            sh "kind load docker-image ${BACKEND_IMAGE} --name ${KIND_CLUSTER_NAME} || true"
            sh "kind load docker-image ${FRONTEND_IMAGE} --name ${KIND_CLUSTER_NAME} || true"
            sh "kubectl set image deployment/backend backend=${BACKEND_IMAGE} --record || true"
            sh "kubectl set image deployment/frontend frontend=${FRONTEND_IMAGE} --record || true"
          } else {
            // assume cluster can access the built images directly (e.g. running in same host)
            sh "kubectl set image deployment/backend backend=${BACKEND_IMAGE} --record || true"
            sh "kubectl set image deployment/frontend frontend=${FRONTEND_IMAGE} --record || true"
          }
        }
      }
    }
  }

  post {
    success {
      echo 'Deployed to Kubernetes successfully.'
    }
    failure {
      echo 'Build or deploy failed.'
    }
  }
}
