pipeline {
  agent any

  environment {
    BACKEND_IMAGE = 'chatapp-backend:latest'
    FRONTEND_IMAGE = 'chatapp-frontend:latest'
    K8S_MANIFEST_DIR = 'k8s'
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

          // Update deployments with the newly built images
          sh 'kubectl set image deployment/backend backend=${BACKEND_IMAGE} --record || true'
          sh 'kubectl set image deployment/frontend frontend=${FRONTEND_IMAGE} --record || true'
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
